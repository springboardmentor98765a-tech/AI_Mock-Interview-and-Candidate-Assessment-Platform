import os
import json
import numpy as np
import tensorflow as tf

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from io import BytesIO


# ============================================================
# SmartHire AI - Emotion CNN API
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "emotion_cnn.keras"
)

LABEL_MAP_PATH = os.path.join(
    BASE_DIR,
    "emotion_labels.json"
)

IMG_SIZE = (100, 100)

# ============================================================
# Flask App
# ============================================================

app = Flask(__name__)
CORS(app)

# ============================================================
# Load CNN Model
# ============================================================

print("\n========================================")
print("       SMART HIRE AI")
print("       EMOTION CNN API")
print("========================================")

print("\nLoading emotion CNN...")

model = tf.keras.models.load_model(MODEL_PATH)

print("CNN loaded successfully! ✅")


# ============================================================
# Load Emotion Labels
# ============================================================

with open(LABEL_MAP_PATH, "r") as f:
    label_map = json.load(f)

print("Emotion labels loaded successfully! ✅")

print("\nEmotion classes:")

for key, value in label_map.items():
    print(f"{key} -> {value}")


# ============================================================
# Health Check
# ============================================================

@app.get("/")
def home():

    return jsonify({
        "success": True,
        "service": "SmartHire AI Emotion CNN API",
        "status": "running"
    })


# ============================================================
# Emotion Prediction
# ============================================================

@app.post("/predict")
def predict_emotion():

    try:

        # ----------------------------------------------------
        # Check image
        # ----------------------------------------------------

        if "image" not in request.files:

            return jsonify({
                "success": False,
                "message": "Image file is required"
            }), 400


        uploaded_file = request.files["image"]


        if uploaded_file.filename == "":

            return jsonify({
                "success": False,
                "message": "No image selected"
            }), 400


        # ----------------------------------------------------
        # Read image
        # ----------------------------------------------------

        image_bytes = uploaded_file.read()

        image = Image.open(
            BytesIO(image_bytes)
        ).convert("RGB")


        # ----------------------------------------------------
        # Resize
        # ----------------------------------------------------

        image = image.resize(IMG_SIZE)


        # ----------------------------------------------------
        # Convert to NumPy
        # Same preprocessing used during prediction
        # ----------------------------------------------------

        image_array = np.array(
            image
        ).astype("float32") / 255.0


        # Add batch dimension
        image_array = np.expand_dims(
            image_array,
            axis=0
        )


        # ----------------------------------------------------
        # CNN Prediction
        # ----------------------------------------------------

        predictions = model.predict(
            image_array,
            verbose=0
        )[0]


        # ----------------------------------------------------
        # Find dominant emotion
        # ----------------------------------------------------

        predicted_index = int(
            np.argmax(predictions)
        )

        predicted_label = str(
            predicted_index + 1
        )

        predicted_emotion = label_map[
            predicted_label
        ]

        confidence = float(
            predictions[predicted_index] * 100
        )


        # ----------------------------------------------------
        # All emotion probabilities
        # ----------------------------------------------------

        emotions = {}

        for index, probability in enumerate(predictions):

            label = str(index + 1)

            emotion = label_map[label]

            emotions[emotion] = round(
                float(probability * 100),
                2
            )


        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        result = {

            "success": True,

            "emotion": predicted_emotion,

            "confidence": round(
                confidence,
                2
            ),

            "emotions": emotions
        }


        print(
            f"\nEmotion: {predicted_emotion}"
        )

        print(
            f"Confidence: {confidence:.2f}%"
        )


        return jsonify(result)


    except Exception as error:

        print(
            "\nEmotion prediction error:",
            error
        )

        return jsonify({

            "success": False,

            "message":
                "Emotion prediction failed",

            "error":
                str(error)

        }), 500


# ============================================================
# Start API
# ============================================================

if __name__ == "__main__":

    print("\n========================================")
    print("Emotion API started")
    print("URL: http://127.0.0.1:5001")
    print("========================================")

    app.run(
        host="127.0.0.1",
        port=5001,
        debug=False
    )