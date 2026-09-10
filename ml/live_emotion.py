import os
import json
import cv2
import numpy as np
import tensorflow as tf
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


# ============================================================
# SmartHire AI - Live Emotion Detection
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

FACE_MODEL_PATH = os.path.join(
    BASE_DIR,
    "face_detector.tflite"
)

IMG_SIZE = (100, 100)


# ============================================================
# LOAD CNN
# ============================================================

print("Loading emotion CNN...")

model = tf.keras.models.load_model(
    MODEL_PATH
)

print("CNN loaded successfully! ✅")


# ============================================================
# LOAD EMOTION LABELS
# ============================================================

with open(
    LABEL_MAP_PATH,
    "r"
) as f:

    label_map = json.load(f)

print("Emotion labels loaded successfully! ✅")


# ============================================================
# CHECK FACE MODEL
# ============================================================

if not os.path.exists(FACE_MODEL_PATH):

    print("\n❌ face_detector.tflite not found!")

    print(
        "Please download the face detector model "
        "into the ml folder."
    )

    exit()


# ============================================================
# CREATE MEDIAPIPE FACE DETECTOR
# ============================================================

print("Loading MediaPipe face detector...")

base_options = python.BaseOptions(
    model_asset_path=FACE_MODEL_PATH
)

options = vision.FaceDetectorOptions(
    base_options=base_options,
    min_detection_confidence=0.5
)

detector = vision.FaceDetector.create_from_options(
    options
)

print(
    "MediaPipe face detector loaded successfully! ✅"
)


# ============================================================
# START WEBCAM
# ============================================================

cap = cv2.VideoCapture(0)

if not cap.isOpened():

    print("❌ Could not open webcam.")

    detector.close()

    exit()


print()
print("============================================")
print("       SMART HIRE AI")
print("       LIVE EMOTION DETECTION")
print("============================================")
print()
print("Webcam started successfully! 🎥")
print("Press Q to quit.")
print()


# ============================================================
# MAIN LOOP
# ============================================================

while True:

    success, frame = cap.read()

    if not success:

        print("❌ Could not read webcam frame.")

        break


    # Mirror webcam
    frame = cv2.flip(
        frame,
        1
    )


    frame_height, frame_width = frame.shape[:2]


    # ========================================================
    # OpenCV BGR → RGB
    # ========================================================

    rgb_frame = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )


    # ========================================================
    # Create MediaPipe image
    # ========================================================

    mp_image = mp.Image(
    image_format=mp.ImageFormat.SRGB,
    data=rgb_frame
)


    # ========================================================
    # Detect face
    # ========================================================

    detection_result = detector.detect(
        mp_image
    )


    # ========================================================
    # PROCESS DETECTIONS
    # ========================================================

    if detection_result.detections:

        for detection in detection_result.detections:

            bbox = detection.bounding_box


            # Bounding box
            x = bbox.origin_x
            y = bbox.origin_y
            w = bbox.width
            h = bbox.height


            # Keep coordinates inside frame
            x = max(
                0,
                x
            )

            y = max(
                0,
                y
            )

            x2 = min(
                frame_width,
                x + w
            )

            y2 = min(
                frame_height,
                y + h
            )


            # =================================================
            # Crop face
            # =================================================

            face = frame[
                y:y2,
                x:x2
            ]


            if face.size == 0:

                continue


            # =================================================
            # Convert BGR → RGB
            # =================================================

            face_rgb = cv2.cvtColor(
                face,
                cv2.COLOR_BGR2RGB
            )


            # =================================================
            # Resize for CNN
            # =================================================

            face_rgb = cv2.resize(
                face_rgb,
                IMG_SIZE
            )


            # =================================================
            # Normalize
            # =================================================

            face_array = (
                face_rgb.astype(
                    "float32"
                ) / 255.0
            )


            # =================================================
            # Add batch dimension
            # =================================================

            face_array = np.expand_dims(
                face_array,
                axis=0
            )


            # =================================================
            # CNN PREDICTION
            # =================================================

            predictions = model.predict(
                face_array,
                verbose=0
            )[0]


            predicted_index = int(
                np.argmax(
                    predictions
                )
            )


            predicted_label = str(
                predicted_index + 1
            )


            emotion = label_map.get(
                predicted_label,
                "Unknown"
            )


            confidence = (
                predictions[
                    predicted_index
                ] * 100
            )


            # =================================================
            # FACE RECTANGLE
            # =================================================

            cv2.rectangle(
                frame,
                (x, y),
                (x2, y2),
                (0, 255, 0),
                2
            )


            # =================================================
            # EMOTION TEXT
            # =================================================

            emotion_text = (
                f"{emotion}: "
                f"{confidence:.1f}%"
            )


            cv2.putText(
                frame,
                emotion_text,
                (
                    x,
                    max(
                        30,
                        y - 10
                    )
                ),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 0),
                2
            )


            # =================================================
            # FACE DETECTION SCORE
            # =================================================

            if detection.categories:

                face_score = (
                    detection.categories[0].score
                    * 100
                )


                score_text = (
                    f"Face: "
                    f"{face_score:.1f}%"
                )


                cv2.putText(
                    frame,
                    score_text,
                    (
                        x,
                        min(
                            frame_height - 10,
                            y2 + 25
                        )
                    ),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (255, 255, 255),
                    2
                )


    else:

        cv2.putText(
            frame,
            "No face detected",
            (30, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255),
            2
        )


    # ========================================================
    # DISPLAY
    # ========================================================

    cv2.imshow(
        "SmartHire AI - Live Emotion Detection",
        frame
    )


    # ========================================================
    # QUIT
    # ========================================================

    key = cv2.waitKey(1) & 0xFF


    if key == ord("q"):

        break


# ============================================================
# CLEANUP
# ============================================================

cap.release()

detector.close()

cv2.destroyAllWindows()


print()
print("Live emotion detection stopped. ✅")