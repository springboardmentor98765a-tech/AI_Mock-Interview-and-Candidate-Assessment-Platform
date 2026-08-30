import os
import math
import cv2
import numpy as np
import onnxruntime as ort

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "models",
    "emotion-ferplus-8.onnx"
)

EMOTION_LABELS = {
    0: "neutral",
    1: "happiness",
    2: "surprise",
    3: "sadness",
    4: "anger",
    5: "disgust",
    6: "fear",
    7: "contempt"
}

# Typical webcam/browser interview recordings are well below this limit.
MIN_VALID_VIDEO_FPS = 1
MAX_VALID_VIDEO_FPS = 240

# Load the CNN once when the backend starts.
session = ort.InferenceSession(
    MODEL_PATH,
    providers=["CPUExecutionProvider"]
)

input_name = session.get_inputs()[0].name

# OpenCV's built-in face detector (lazy load).
FACE_CASCADE = None

def get_face_cascade():
    global FACE_CASCADE
    if FACE_CASCADE is None:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        FACE_CASCADE = cv2.CascadeClassifier(cascade_path)
    return FACE_CASCADE


def softmax(scores):
    scores = scores - np.max(scores)
    probabilities = np.exp(scores) / np.sum(np.exp(scores))
    return probabilities

def predict_face_emotion(face_gray):
    """
    Predict emotion for one grayscale face crop.
    """

    face_resized = cv2.resize(
        face_gray,
        (64, 64)
    )

    # Convert to float32.
    input_data = face_resized.astype(
        np.float32
    )

    # Model expects:
    # N x C x H x W
    input_data = input_data.reshape(
        1,
        1,
        64,
        64
    )

    outputs = session.run(
        None,
        {
            input_name: input_data
        }
    )

    scores = outputs[0][0]

    probabilities = softmax(scores)

    result = {}

    for index, probability in enumerate(probabilities):
        emotion = EMOTION_LABELS[index]

        result[emotion] = float(probability)

    dominant = max(
        result,
        key=result.get
    )

    return {
        "dominant_emotion": dominant,
        "probabilities": result
    }

def analyze_video_emotions(
    video_path,
    sample_every_seconds=3
):
    """
    Analyze selected frames from an interview video.

    One frame is sampled every few seconds rather than
    processing every video frame.
    """

    if not os.path.exists(video_path):
        return {
            "status": "error",
            "message": "Video file not found"
        }

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {
            "status": "error",
            "message": "Could not open video"
        }

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    fps_is_valid = (
        isinstance(fps, (int, float))
        and math.isfinite(fps)
        and MIN_VALID_VIDEO_FPS <= fps <= MAX_VALID_VIDEO_FPS
    )
    total_frames_is_valid = (
        isinstance(total_frames, (int, float))
        and math.isfinite(total_frames)
        and total_frames > 0
    )

    # A valid FPS lets us select one frame every configured number of seconds.
    # When FPS is unavailable, timestamps are preferred; the fallback is sampling-only.
    fallback_fps = 30
    frame_interval = max(1, int((fps if fps_is_valid else fallback_fps) * sample_every_seconds))
    duration_seconds = (total_frames / fps) if fps_is_valid and total_frames_is_valid else None
    expected_samples = (
        max(1, math.ceil(duration_seconds / sample_every_seconds))
        if duration_seconds is not None
        else None
    )

    print(f"Video FPS: {fps if fps_is_valid else f'unavailable/invalid ({fps})'}")
    print(f"Total frames: {int(total_frames) if total_frames_is_valid else 'unavailable/invalid'}")
    print(f"Duration: {round(duration_seconds, 2) if duration_seconds is not None else 'unavailable'} seconds")
    print(f"Sampling interval: {sample_every_seconds} seconds")
    print(f"Expected sampled frames: {expected_samples if expected_samples is not None else 'determined while reading'}")
    if not fps_is_valid:
        print("FPS unavailable/invalid; using fallback sampling strategy.")

    frames_sampled = 0
    frames_with_face = 0
    frame_number = 0
    next_sample_time_ms = 0.0
    last_timestamp_ms = None

    emotion_totals = {
        emotion: 0.0
        for emotion in EMOTION_LABELS.values()
    }

    try:

        while True:

            success, frame = cap.read()

            if not success:
                break

            if fps_is_valid:
                should_sample = frame_number % frame_interval == 0
            else:
                # Some containers still expose useful elapsed timestamps even without FPS.
                position_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
                timestamp_is_valid = (
                    isinstance(position_ms, (int, float))
                    and math.isfinite(position_ms)
                    and position_ms >= 0
                    and (last_timestamp_ms is None or position_ms > last_timestamp_ms)
                )
                if timestamp_is_valid:
                    should_sample = position_ms >= next_sample_time_ms
                    if should_sample:
                        next_sample_time_ms = position_ms + (sample_every_seconds * 1000)
                    last_timestamp_ms = position_ms
                else:
                    # This fallback does not claim the recording is 30 FPS; it only limits work.
                    should_sample = frame_number % frame_interval == 0

            if not should_sample:
                frame_number += 1
                continue

            frames_sampled += 1

            gray = cv2.cvtColor(
                frame,
                cv2.COLOR_BGR2GRAY
            )

            cascade = get_face_cascade()
            faces = cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(60, 60)
            )

            if len(faces) == 0:
                frame_number += 1
                continue

            # Select the largest face.
            face = max(
                faces,
                key=lambda box: box[2] * box[3]
            )

            x, y, w, h = face

            face_gray = gray[
                y:y + h,
                x:x + w
            ]

            if face_gray.size == 0:
                frame_number += 1
                continue

            frames_with_face += 1

            prediction = predict_face_emotion(
                face_gray
            )

            for emotion, probability in prediction[
                "probabilities"
            ].items():

                emotion_totals[emotion] += probability

            frame_number += 1

    finally:
        cap.release()

    print(f"Frames sampled: {frames_sampled}")
    print(f"Frames with face: {frames_with_face}")

    if frames_sampled == 0:
        return {
            "status": "no_frames",
            "message": "No readable frames were sampled",
            "frames_sampled": 0,
            "frames_with_face": 0,
            "frames_processed": 0
        }

    if frames_with_face == 0:
        return {
            "status": "no_face",
            "dominant_emotion": None,
            "emotion_distribution": {},
            "frames_sampled": frames_sampled,
            "frames_with_face": 0,
            "frames_processed": 0
        }

    averages = {
        emotion: round(
            total / frames_with_face,
            4
        )
        for emotion, total in emotion_totals.items()
    }

    dominant_emotion = max(
        averages,
        key=averages.get
    )

    return {
        "status": "success",
        "dominant_emotion": dominant_emotion,
        "emotion_distribution": averages,
        "frames_sampled": frames_sampled,
        "frames_with_face": frames_with_face,
        # Backwards-compatible name: successfully analyzed face samples.
        "frames_processed": frames_with_face
    }

