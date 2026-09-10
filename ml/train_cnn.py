import os
import json
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, models

# ============================================
# RAF-DB CNN - SmartHire AI
# ============================================

print("\n========================================")
print("   SmartHire AI - RAF-DB CNN Training")
print("========================================\n")

# -------------------------------
# Paths
# -------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_DIR = os.path.join(BASE_DIR, "dataset")
TRAIN_DIR = os.path.join(DATASET_DIR, "DATASET", "train")
TEST_DIR = os.path.join(DATASET_DIR, "DATASET", "test")

TRAIN_CSV = os.path.join(DATASET_DIR, "train_labels.csv")
TEST_CSV = os.path.join(DATASET_DIR, "test_labels.csv")

MODEL_PATH = os.path.join(BASE_DIR, "emotion_cnn.keras")
LABEL_MAP_PATH = os.path.join(BASE_DIR, "emotion_labels.json")


# -------------------------------
# Configuration
# -------------------------------

IMG_SIZE = (100, 100)
BATCH_SIZE = 64
EPOCHS = 15
NUM_CLASSES = 7
SEED = 42

print("TensorFlow version:", tf.__version__)
print("Training directory:", TRAIN_DIR)
print("Testing directory :", TEST_DIR)


# ============================================
# Emotion labels
# ============================================

LABEL_MAP = {
    1: "Surprise",
    2: "Fear",
    3: "Disgust",
    4: "Happiness",
    5: "Sadness",
    6: "Anger",
    7: "Neutral"
}

# Save mapping for later prediction
with open(LABEL_MAP_PATH, "w") as f:
    json.dump(LABEL_MAP, f, indent=4)

print("\nEmotion mapping:")

for label, emotion in LABEL_MAP.items():
    print(f"{label} -> {emotion}")


# ============================================
# Load CSV files
# ============================================

train_df = pd.read_csv(TRAIN_CSV)
test_df = pd.read_csv(TEST_CSV)

print("\nTraining images:", len(train_df))
print("Testing images :", len(test_df))


# ============================================
# Create image paths
# ============================================

def create_path(row, base_dir):
    return os.path.join(
        base_dir,
        str(int(row["label"])),
        row["image"]
    )


train_df["path"] = train_df.apply(
    lambda row: create_path(row, TRAIN_DIR),
    axis=1
)

test_df["path"] = test_df.apply(
    lambda row: create_path(row, TEST_DIR),
    axis=1
)


# ============================================
# Convert labels
# TensorFlow uses 0-6
# RAF-DB uses 1-7
# ============================================

train_labels = train_df["label"].astype(int).values - 1
test_labels = test_df["label"].astype(int).values - 1

train_paths = train_df["path"].values
test_paths = test_df["path"].values


# ============================================
# Check files
# ============================================

print("\nChecking dataset files...")

missing_train = sum(
    not os.path.exists(path)
    for path in train_paths
)

missing_test = sum(
    not os.path.exists(path)
    for path in test_paths
)

print("Missing training images:", missing_train)
print("Missing testing images :", missing_test)


if missing_train > 0 or missing_test > 0:
    print("\nERROR: Some dataset images are missing.")
    exit()


print("All dataset images found! ✅")


# ============================================
# Train / Validation split
# ============================================

rng = np.random.default_rng(SEED)

indices = np.arange(len(train_paths))
rng.shuffle(indices)

validation_size = int(len(indices) * 0.10)

validation_indices = indices[:validation_size]
training_indices = indices[validation_size:]

x_train_paths = train_paths[training_indices]
y_train = train_labels[training_indices]

x_val_paths = train_paths[validation_indices]
y_val = train_labels[validation_indices]


print("\nDataset split:")
print("Training   :", len(x_train_paths))
print("Validation :", len(x_val_paths))
print("Testing    :", len(test_paths))


# ============================================
# Image loading function
# ============================================

def load_image(path, label):

    image = tf.io.read_file(path)

    image = tf.image.decode_jpeg(
        image,
        channels=3
    )

    image = tf.image.resize(
        image,
        IMG_SIZE
    )

    image = tf.cast(
        image,
        tf.float32
    ) / 255.0

    return image, label


# ============================================
# Create TensorFlow datasets
# ============================================

train_dataset = tf.data.Dataset.from_tensor_slices(
    (x_train_paths, y_train)
)

train_dataset = train_dataset.shuffle(
    3000,
    seed=SEED
)

train_dataset = train_dataset.map(
    load_image,
    num_parallel_calls=tf.data.AUTOTUNE
)

train_dataset = train_dataset.batch(
    BATCH_SIZE
)

train_dataset = train_dataset.prefetch(
    tf.data.AUTOTUNE
)


validation_dataset = tf.data.Dataset.from_tensor_slices(
    (x_val_paths, y_val)
)

validation_dataset = validation_dataset.map(
    load_image,
    num_parallel_calls=tf.data.AUTOTUNE
)

validation_dataset = validation_dataset.batch(
    BATCH_SIZE
)

validation_dataset = validation_dataset.prefetch(
    tf.data.AUTOTUNE
)


test_dataset = tf.data.Dataset.from_tensor_slices(
    (test_paths, test_labels)
)

test_dataset = test_dataset.map(
    load_image,
    num_parallel_calls=tf.data.AUTOTUNE
)

test_dataset = test_dataset.batch(
    BATCH_SIZE
)

test_dataset = test_dataset.prefetch(
    tf.data.AUTOTUNE
)


# ============================================
# Data augmentation
# ============================================

data_augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.08),
    layers.RandomZoom(0.10),
], name="data_augmentation")


# ============================================
# CNN MODEL
# ============================================

model = models.Sequential([

    layers.Input(
        shape=(100, 100, 3)
    ),

    data_augmentation,

    # CNN Block 1
    layers.Conv2D(
        32,
        (3, 3),
        activation="relu",
        padding="same"
    ),

    layers.BatchNormalization(),

    layers.MaxPooling2D(
        (2, 2)
    ),

    # CNN Block 2
    layers.Conv2D(
        64,
        (3, 3),
        activation="relu",
        padding="same"
    ),

    layers.BatchNormalization(),

    layers.MaxPooling2D(
        (2, 2)
    ),

    # CNN Block 3
    layers.Conv2D(
        128,
        (3, 3),
        activation="relu",
        padding="same"
    ),

    layers.BatchNormalization(),

    layers.MaxPooling2D(
        (2, 2)
    ),

    # CNN Block 4
    layers.Conv2D(
        256,
        (3, 3),
        activation="relu",
        padding="same"
    ),

    layers.BatchNormalization(),

    layers.MaxPooling2D(
        (2, 2)
    ),

    # Feature extraction
    layers.GlobalAveragePooling2D(),

    layers.Dense(
        128,
        activation="relu"
    ),

    layers.Dropout(0.5),

    # 7 emotion classes
    layers.Dense(
        NUM_CLASSES,
        activation="softmax"
    )
])


# ============================================
# Compile
# ============================================

model.compile(

    optimizer=tf.keras.optimizers.Adam(
        learning_rate=0.0001
    ),

    loss="sparse_categorical_crossentropy",

    metrics=[
        "accuracy"
    ]
)


# ============================================
# Display model
# ============================================

print("\n========================================")
print("CNN MODEL")
print("========================================\n")

model.summary()


# ============================================
# Class weights
# Handles RAF-DB class imbalance
# ============================================

class_counts = np.bincount(
    y_train,
    minlength=NUM_CLASSES
)

total_samples = len(y_train)

class_weights = {}

for class_index in range(NUM_CLASSES):

    if class_counts[class_index] > 0:

        class_weights[class_index] = (
            total_samples /
            (NUM_CLASSES * class_counts[class_index])
        )

print("\nClass weights:")

for index, weight in class_weights.items():

    emotion = LABEL_MAP[index + 1]

    print(
        f"{index + 1} ({emotion}): "
        f"{weight:.3f}"
    )


# ============================================
# Callbacks
# ============================================

callbacks = [

    tf.keras.callbacks.ModelCheckpoint(
        MODEL_PATH,
        monitor="val_accuracy",
        save_best_only=True,
        verbose=1
    ),

    tf.keras.callbacks.EarlyStopping(
        monitor="val_accuracy",
        patience=4,
        restore_best_weights=True,
        verbose=1
    ),

    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=2,
        min_lr=0.000001,
        verbose=1
    )
]


# ============================================
# TRAIN CNN
# ============================================

print("\n========================================")
print("STARTING CNN TRAINING")
print("========================================\n")

history = model.fit(

    train_dataset,

    validation_data=validation_dataset,

    epochs=EPOCHS,

    class_weight=class_weights,

    callbacks=callbacks
)


# ============================================
# Evaluate
# ============================================

print("\n========================================")
print("EVALUATING MODEL")
print("========================================\n")

test_loss, test_accuracy = model.evaluate(
    test_dataset
)

print(
    f"\nTest Loss: {test_loss:.4f}"
)

print(
    f"Test Accuracy: {test_accuracy * 100:.2f}%"
)


# ============================================
# Save final model
# ============================================

model.save(MODEL_PATH)

print("\n========================================")
print("TRAINING COMPLETED ✅")
print("========================================")

print("\nModel saved at:")
print(MODEL_PATH)

print("\nLabel mapping saved at:")
print(LABEL_MAP_PATH)

print("\nEmotion classes:")

for label, emotion in LABEL_MAP.items():
    print(f"{label} -> {emotion}")

print("\n🔥 CNN MODEL READY 🔥")