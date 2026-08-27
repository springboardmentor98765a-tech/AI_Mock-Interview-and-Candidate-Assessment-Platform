import json
import os
import random
import time

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

PROJECT = r"D:\Education\Coding\Infosys Internship Project\SmartHire AI (My Work)"
DATASET = r"D:\Education\Coding\Infosys Internship Project\Dataset\Eye Contact Tracking\EyeDrive Eye-Gaze Dataset\pupil_dataset"

IMG_EXTS = {".jpg", ".jpeg", ".png"}
CLASS_MAP = {
    "center": "toward_camera",
    "left": "looking_left",
    "right": "looking_right",
    "up": "looking_up",
    "stop": "eyes_closed",
}
CLASS_ORDER = ("toward_camera", "looking_left", "looking_right", "looking_up", "eyes_closed")
INPUT_SIZE = 160
BATCH = 32
SEED = 42
VAL_FRACTION = 0.12
TEST_FRACTION = 0.10


def build_index():
    import collections
    index = {c: [] for c in CLASS_ORDER}
    for src, dst in CLASS_MAP.items():
        d = os.path.join(DATASET, src)
        for f in sorted(os.listdir(d)):
            if os.path.splitext(f)[1].lower() in IMG_EXTS:
                index[dst].append(os.path.join(d, f))
    print("== dataset index ==")
    for c in CLASS_ORDER:
        print(f"  {c:14s} {len(index[c]):5d}")
    counts = collections.Counter()
    return index


def stratified_split(items):
    items = sorted(items)
    random.Random(SEED).shuffle(items)
    n = len(items)
    n_test = max(1, int(n * TEST_FRACTION))
    n_val = max(1, int(n * VAL_FRACTION))
    return items[n_test + n_val:], items[n_test:n_test + n_val], items[:n_test]


def make_dataset(paths, labels, training):
    import tensorflow as tf

    def load(path, label):
        raw = tf.io.read_file(path)
        img = tf.io.decode_jpeg(raw, channels=3)
        img.set_shape([None, None, 3])
        img = tf.image.resize(img, (INPUT_SIZE, INPUT_SIZE))
        return img, label

    ds = tf.data.Dataset.from_tensor_slices((paths, labels))
    if training:
        ds = ds.shuffle(min(len(paths), 4000), seed=SEED, reshuffle_each_iteration=True)
    ds = ds.map(load, num_parallel_calls=tf.data.AUTOTUNE)
    if training:
        rot = tf.keras.layers.RandomRotation(0.04)
        trans = tf.keras.layers.RandomTranslation(0.06, 0.06)
        zoom = tf.keras.layers.RandomZoom(0.08)
        bright = tf.keras.layers.RandomBrightness(0.12)
        contrast = tf.keras.layers.RandomContrast(0.15)

        def augment(img, label):
            x = rot(img[None])[0]
            x = trans(x[None])[0]
            x = zoom(x[None])[0]
            x = tf.clip_by_value(bright(x[None])[0], 0.0, 255.0)
            x = tf.clip_by_value(contrast(x[None])[0], 0.0, 255.0)
            return x, label
        ds = ds.map(augment, num_parallel_calls=tf.data.AUTOTUNE)
    return ds.batch(BATCH).prefetch(tf.data.AUTOTUNE)


def main():
    index = build_index()

    train_p, train_l, val_p, val_l, test_p, test_l = [], [], [], [], [], []
    cls_to_idx = {c: i for i, c in enumerate(CLASS_ORDER)}
    for cls in CLASS_ORDER:
        tr, va, te = stratified_split(index[cls])
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

    mobilenet = __import__("tensorflow").keras.applications.MobileNetV2(
        input_shape=(INPUT_SIZE, INPUT_SIZE, 3), alpha=1.0,
        include_top=False, weights="imagenet",
    )
    mobilenet.trainable = False

    inputs = layers.Input(shape=(INPUT_SIZE, INPUT_SIZE, 3), name="eye_crop")
    x = __import__("tensorflow").keras.applications.mobilenet_v2.preprocess_input(inputs)
    x = mobilenet(x, training=False)
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dropout(0.30, name="head_dropout")(x)
    x = layers.Dense(192, activation="relu", name="head_dense")(x)
    x = layers.Dropout(0.20, name="head_dropout2")(x)
    outputs = layers.Dense(len(CLASS_ORDER), activation="softmax", name="gaze_head")(x)
    model = __import__("tensorflow").keras.Model(inputs, outputs, name="smarthire-gaze-cnn")

    out_dir = os.path.join(PROJECT, "server", "storage", "models")
    os.makedirs(out_dir, exist_ok=True)
    artifact = os.path.join(out_dir, "gaze_cnn.keras")

    loss = __import__("tensorflow").keras.losses.SparseCategoricalCrossentropy(from_logits=False)
    cb = [
        callbacks.EarlyStopping(monitor="val_accuracy", patience=6, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.4, patience=2, min_lr=1e-6, verbose=1),
    ]

    t0 = time.time()
    print("\n== PHASE 1: frozen base ==")
    model.compile(optimizer=optimizers.Adam(8e-4),
                  loss=loss, metrics=["accuracy"])
    model.fit(train_ds, validation_data=val_ds, epochs=14, class_weight=class_weight,
              callbacks=cb, verbose=2)

    print(f"\n== PHASE 2: fine-tune top 90 layers ({time.time() - t0:.0f}s elapsed) ==")
    mobilenet.trainable = True
    for layer in mobilenet.layers[:-90]:
        layer.trainable = False
    model.compile(optimizer=optimizers.Adam(2e-5),
                  loss=loss, metrics=["accuracy"])
    model.fit(train_ds, validation_data=val_ds, epochs=20, class_weight=class_weight,
              callbacks=cb, verbose=2)

    print(f"\n== PHASE 3: full fine-tune, very low LR ({time.time() - t0:.0f}s elapsed) ==")
    for layer in mobilenet.layers:
        layer.trainable = True
    model.compile(optimizer=optimizers.Adam(5e-6),
                  loss=loss, metrics=["accuracy"])
    model.fit(train_ds, validation_data=val_ds, epochs=10, class_weight=class_weight,
              callbacks=cb, verbose=2)
    print(f"training wall time: {(time.time() - t0) / 60.0:.1f} min")

    print("\n== TEST EVALUATION ==")
    probs = model.predict(test_ds, verbose=0)
    y_true = [int(y.numpy()) for _, y in test_ds.unbatch()]
    y_pred = probs.argmax(axis=1).tolist()
    conf = [[0] * len(CLASS_ORDER) for _ in CLASS_ORDER]
    for t, p in zip(y_true, y_pred):
        conf[t][p] += 1
    acc = sum(conf[i][i] for i in range(len(CLASS_ORDER))) / max(1, sum(sum(r) for r in conf))
    header = "".join(f"{n[:10]:>12s}" for n in ["true\\pred"] + list(CLASS_ORDER))
    print(header)
    for i, row in enumerate(conf):
        print(CLASS_ORDER[i].rjust(10) + " " + "".join(f"{v:>11d}" for v in row) + f"   recall={row[i]/max(1,sum(row)):.2f}")
    print(f"test accuracy: {acc:.3f}")

    model.save(artifact)
    with open(os.path.join(out_dir, "gaze_cnn_labels.json"), "w") as fh:
        json.dump({"classes": CLASS_ORDER, "input": [INPUT_SIZE, INPUT_SIZE, 3],
                   "preprocess": "mobilenet_v2", "seed": SEED}, fh, indent=2)
    print(f"\nsaved artifact: {artifact}")
    print("label order:", CLASS_ORDER)


if __name__ == "__main__":
    main()
