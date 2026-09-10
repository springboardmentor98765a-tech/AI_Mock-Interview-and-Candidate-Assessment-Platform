import os
import json
import numpy as np
import tensorflow as tf
from PIL import Image

# ============================================
# SmartHire AI - Emotion Prediction Test
# ============================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "emotion_cnn.keras")
LABEL_MAP_PATH = os.path.join(BASE_DIR, "emotion_labels.json")

# Test image
IMAGE_PATH = os.path.join(
    BASE_DIR,
    "dataset",
    "DATASET",
    "test",
    "1",
    "test_00001_aligned.jpg"
)

IMG_SIZE = (100, 100)

# ============================================
# Load model
# ============================================

print("\nLoading CNN model...")

model = tf.keras.models.load_model(MODEL_PATH)

print("CNN model loaded successfully! ✅")


# ============================================
# Load emotion labels
# ============================================

with open(LABEL_MAP_PATH, "r") as f:
    label_map = json.load(f)


# ============================================
# Check image
# ============================================

if not os.path.exists(IMAGE_PATH):
    print("\n❌ Test image not found:")
    print(IMAGE_PATH)
    print("\nWe'll select an available test image instead.")

    import glob

    images = glob.glob(
        os.path.join(
            BASE_DIR,
            "dataset",
            "DATASET",
            "test",
            "*",
            "*.jpg"
        )
    )

    if not images:
        print("❌ No test images found.")
        exit()

    IMAGE_PATH = images[0]


print("\nTesting image:")
print(IMAGE_PATH)


# ============================================
# Load image
# ============================================

image = Image.open(IMAGE_PATH).convert("RGB")

image = image.resize(IMG_SIZE)

image_array = np.array(image).astype("float32") / 255.0

image_array = np.expand_dims(
    image_array,
    axis=0
)


# ============================================
# Predict
# ============================================

predictions = model.predict(
    image_array,
    verbose=0
)[0]


predicted_index = int(
    np.argmax(predictions)
)

predicted_label = predicted_index + 1

predicted_emotion = label_map[
    str(predicted_label)
]

confidence = (
    predictions[predicted_index] * 100
)


# ============================================
# Display result
# ============================================

print("\n========================================")
print("       EMOTION PREDICTION")
print("========================================")

print(
    f"\nPredicted Emotion : {predicted_emotion}"
)

print(
    f"Confidence        : {confidence:.2f}%"
)


print("\nAll emotion probabilities:")

for index, probability in enumerate(predictions):

    label = str(index + 1)

    emotion = label_map[label]

    percentage = probability * 100

    print(
        f"{emotion:10s} : {percentage:6.2f}%"
    )


print("\n========================================")
print("Prediction completed ✅")
print("========================================\n")