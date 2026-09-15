import json
import os
import random
import sys
import time

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

PROJECT = r"D:\Education\Coding\Infosys Internship Project\SmartHire AI (My Work)"
DATASET = r"D:\Education\Coding\Infosys Internship Project\Dataset\Emotion Detection Dataset"
sys.path.insert(0, os.path.join(PROJECT, "server"))

IMG_EXTS = {".jpg", ".jpeg", ".png"}
# MUST equal services.emotion_cnn.THREE_STATE_CLASSES
CLASS_ORDER = ("fear_cluster", "confidence", "confused")
SEED = 42
VAL_FRACTION = 0.10
TEST_FRACTION = 0.08
BATCH = 128


def collect(dirs):
    out = []
    for d in dirs:
        for root, _dirs, files in os.walk(d):
            for f in files:
                if os.path.splitext(f)[1].lower() in IMG_EXTS:
                    out.append(os.path.join(root, f))
    return out


def stratified_split(items):
    items = sorted(items)
    rng = random.Random(SEED)
    rng.shuffle(items)
    n = len(items)
    n_test = max(1, int(n * TEST_FRACTION))
    n_val = max(1, int(n * VAL_FRACTION))
    return items[n_test + n_val:], items[n_test:n_test + n_val], items[:n_test]


def build_index():
    index = {
        "fear_cluster": stratified_split(collect([os.path.join(DATASET, "Fear")])),
        "confidence": stratified_split(collect([
            os.path.join(DATASET, "Confident Train"),
            os.path.join(DATASET, "Confident Test"),
        ])),
        "confused": stratified_split(collect([
            os.path.join(DATASET, "Confused Train"),
            os.path.join(DATASET, "Confused Validation"),
            os.path.join(DATASET, "Confused Test"),
        ])),
    }
    print("== dataset index ==")
    total_train = 0
    for cls in CLASS_ORDER:
        tr, va, te = index[cls]
        total_train += len(tr)
        print(f"  {cls:13s} train={len(tr):6d} val={len(va):5d} test={len(te):5d}")
    print(f"  TOTAL train={total_train}")
    return index


def make_dataset(paths, labels, training):
    import tensorflow as tf

    def load(path, label):
        raw = tf.io.read_file(path)
        img = tf.io.decode_image(raw, channels=1, expand_animations=False)
        img.set_shape([None, None, 1])
        img = tf.image.resize(img, (48, 48))
        return tf.cast(img, tf.float32), label

    ds = tf.data.Dataset.from_tensor_slices((paths, labels))
    if training:
        ds = ds.shuffle(min(len(paths), 20000), seed=SEED, reshuffle_each_iteration=True)
    ds = ds.map(load, num_parallel_calls=tf.data.AUTOTUNE)
    if training:
        flip = tf.keras.layers.RandomFlip("horizontal")
        # Deployment-time domain match: at inference the model receives TIGHT
        # face crops (bbox + 25% margin), while dataset images are full scenes.
        # Random resized crops simulate that tightness so the head does not
        # collapse into predicting the majority texture (the "always
        # Confidence 85%" failure mode).
        rot = tf.keras.layers.RandomRotation(0.06)
        trans = tf.keras.layers.RandomTranslation(0.08, 0.08)
        bright = tf.keras.layers.RandomBrightness(0.10)
        contrast = tf.keras.layers.RandomContrast(0.15)

        def random_resized_crop(img):
            scale = tf.random.uniform([], 0.6, 1.0)
            ch = tf.maximum(1, tf.cast(48.0 * scale, tf.int32))
            cw = tf.maximum(1, tf.cast(48.0 * scale, tf.int32))
            y0 = tf.random.uniform([], 0, 48 - ch + 1, dtype=tf.int32)
            x0 = tf.random.uniform([], 0, 48 - cw + 1, dtype=tf.int32)
            x = tf.image.crop_to_bounding_box(img, y0, x0, ch, cw)
            return tf.image.resize(x, (48, 48))

        def augment(img, label):
            x = random_resized_crop(img)
            x = flip(tf.reshape(x, (1, 48, 48, 1)))
            x = tf.squeeze(rot(x), axis=0)
            x = trans(x[None])[0]
            x = bright(x[None])[0]
            c = contrast(x[None])
            return tf.clip_by_value(c[0], 0.0, 255.0), label
        ds = ds.map(augment, num_parallel_calls=tf.data.AUTOTUNE)
    return ds.batch(BATCH).prefetch(tf.data.AUTOTUNE)


def main():
    index = build_index()

    train_p, train_l, val_p, val_l, test_p, test_l = [], [], [], [], [], []
    cls_to_idx = {c: i for i, c in enumerate(CLASS_ORDER)}
    for cls in CLASS_ORDER:
        tr, va, te = index[cls]
        for lst_p, lst_l, group in ((train_p, train_l, tr), (val_p, val_l, va), (test_p, test_l, te)):
            lst_p.extend(group)
            lst_l.extend([cls_to_idx[cls]] * len(group))

    counts = [train_l.count(i) for i in range(len(CLASS_ORDER))]
    total = float(sum(counts))
    class_weight = {i: round(total / (len(CLASS_ORDER) * max(1, counts[i])), 4) for i in range(len(CLASS_ORDER))}
    print("class weights:", class_weight)

    train_ds = make_dataset(train_p, train_l, True)
    val_ds = make_dataset(val_p, val_l, False)
    test_ds = make_dataset(test_p, test_l, False)

    from tensorflow.keras import layers, callbacks, optimizers
    from services import emotion_cnn

    weights_file = emotion_cnn._ensure_weights_file()
    assert weights_file, "fer2013 backbone weights unavailable"
    backbone = emotion_cnn._build_backbone()
    backbone.load_weights(weights_file)
    backbone.pop()
    backbone.add(layers.Dense(len(CLASS_ORDER), activation="softmax", name="emotion_head"))

    out_dir = os.path.join(PROJECT, "server", "storage", "models")
    os.makedirs(out_dir, exist_ok=True)
    artifact = os.path.join(out_dir, "emotion_cnn_3state.keras")

    cb = [
        callbacks.EarlyStopping(
            monitor="val_accuracy", patience=5, restore_best_weights=True),
    ]

    t0 = time.time()
    print("\n== PHASE 1: frozen convolutions ==")
    for layer in backbone.layers:
        layer.trainable = not layer.name.startswith(("conv2d", "max_pooling", "average_pooling"))
    backbone.compile(optimizer=optimizers.Adam(1e-3),
                     loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    backbone.fit(train_ds, validation_data=val_ds, epochs=10, class_weight=class_weight,
                 callbacks=cb, verbose=2)

    print(f"\n== PHASE 2: full fine-tune ({time.time() - t0:.0f}s elapsed) ==")
    for layer in backbone.layers:
        layer.trainable = True
    backbone.compile(optimizer=optimizers.Adam(2e-4),
                     loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    backbone.fit(train_ds, validation_data=val_ds, epochs=22, class_weight=class_weight,
                 callbacks=cb, verbose=2)
    print(f"training wall time: {(time.time() - t0) / 60.0:.1f} min")

    print("\n== TEST EVALUATION ==")
    probs = backbone.predict(test_ds, verbose=0)
    y_true = [int(y.numpy()) for _, y in test_ds.unbatch()]
    y_pred = probs.argmax(axis=1).tolist()
    conf = [[0] * len(CLASS_ORDER) for _ in CLASS_ORDER]
    for t, p in zip(y_true, y_pred):
        conf[t][p] += 1
    acc = sum(conf[i][i] for i in range(len(CLASS_ORDER))) / max(1, sum(sum(r) for r in conf))
    header = "".join(f"{n[:9]:>11s}" for n in ["true\\pred"] + list(CLASS_ORDER))
    print(header)
    for i, row in enumerate(conf):
        print(CLASS_ORDER[i].rjust(9) + " " + "".join(f"{v:>10d}" for v in row) + f"   recall={row[i]/max(1,sum(row)):.2f}")
    print(f"test accuracy: {acc:.3f}")

    backbone.save(artifact)
    with open(os.path.join(out_dir, "emotion_cnn_3state_labels.json"), "w") as fh:
        json.dump({"classes": CLASS_ORDER,
                   "mirror": {"fear_cluster": {"nervousness": 0.5, "fear": 0.5}},
                   "input": [48, 48, 1], "scale": "raw_gray_0_255", "seed": SEED},
                  fh, indent=2)
    print(f"\nsaved artifact: {artifact}")
    print("label order:", CLASS_ORDER)


if __name__ == "__main__":
    main()

