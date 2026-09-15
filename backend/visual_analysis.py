import cv2
import mediapipe as mp
from deepface import DeepFace
import time


# ============================================================
# MEDIAPIPE FACE LANDMARKER
# ============================================================

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

MODEL_PATH = "face_landmarker.task"

base_options = python.BaseOptions(
    model_asset_path=MODEL_PATH
)

options = vision.FaceLandmarkerOptions(
    base_options=base_options,
    num_faces=1,
    output_face_blendshapes=True,
    output_facial_transformation_matrixes=True
)

face_landmarker = vision.FaceLandmarker.create_from_options(
    options
)


# ============================================================
# ALLOWED EMOTIONS
# ============================================================

ALLOWED_EMOTIONS = [
    "happy",
    "fear",
    "surprise",
    "neutral"
]


# ============================================================
# ANALYSIS VARIABLES
# ============================================================

# Total frames in which a face was detected.
face_frames = 0

# Frames where the candidate appeared to look at the camera.
eye_contact_frames = 0

# Frames where the candidate appeared attentive.
attention_frames = 0

# Count how many times each allowed emotion was detected.
emotion_counts = {
    "happy": 0,
    "fear": 0,
    "surprise": 0,
    "neutral": 0
}

# Latest detected emotion.
current_emotion = "Detecting..."

# Time of the last DeepFace analysis.
last_emotion_time = 0

# DeepFace runs once every 2 seconds.
EMOTION_INTERVAL = 2


# ============================================================
# OPEN WEBCAM
# ============================================================

camera = cv2.VideoCapture(0)


# ============================================================
# MAIN LOOP
# ============================================================

while True:

    # Capture a webcam frame.
    success, frame = camera.read()

    if not success:
        print("Could not read from webcam.")
        break


    # ========================================================
    # MEDIAPIPE ANALYSIS
    # ========================================================

    # Convert BGR to RGB.
    rgb_frame = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    # Create MediaPipe image.
    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame
    )

    # Detect face landmarks.
    results = face_landmarker.detect(mp_image)


    # ========================================================
    # FACE DETECTED
    # ========================================================

    if results.face_landmarks:

        face_frames += 1

        # Get the first detected face.
        face = results.face_landmarks[0]


        # ====================================================
        # EYE-CONTACT ESTIMATION
        # ====================================================

        # Nose landmark.
        nose = face[1]

        # Left and right face landmarks.
        left_face = face[234]
        right_face = face[454]

        # Calculate face width.
        face_width = right_face.x - left_face.x

        if face_width != 0:

            nose_position = (
                nose.x - left_face.x
            ) / face_width

        else:

            nose_position = 0.5


        # Estimate whether the candidate is looking
        # toward the camera.
        looking_at_camera = (
            0.35 <= nose_position <= 0.65
        )


        if looking_at_camera:

            eye_contact_frames += 1


        # ====================================================
        # ATTENTION ESTIMATION
        # ====================================================

        # For this initial version, we consider the candidate
        # attentive when a face is visible and approximately
        # facing the camera.
        attentive = looking_at_camera

        if attentive:

            attention_frames += 1


        # ====================================================
        # CALCULATE LIVE METRICS
        # ====================================================

        eye_contact_percentage = (
            eye_contact_frames / face_frames
        ) * 100

        attention_score = (
            attention_frames / face_frames
        ) * 100


        # ====================================================
        # DRAW FACE LANDMARKS
        # ====================================================

        for landmark in face:

            x = int(
                landmark.x * frame.shape[1]
            )

            y = int(
                landmark.y * frame.shape[0]
            )

            cv2.circle(
                frame,
                (x, y),
                1,
                (0, 255, 0),
                -1
            )


        # ====================================================
        # DEEPFACE EMOTION ANALYSIS
        # ====================================================

        current_time = time.time()

        if (
            current_time - last_emotion_time
            >= EMOTION_INTERVAL
        ):

            try:

                emotion_result = DeepFace.analyze(
                    frame,
                    actions=["emotion"],
                    detector_backend="skip",
                    enforce_detection=False,
                    silent=True
                )

                # DeepFace can return a list.
                if isinstance(
                    emotion_result,
                    list
                ):

                    emotion_result = emotion_result[0]


                # Get the dominant emotion.
                detected_emotion = (
                    emotion_result["dominant_emotion"]
                    .lower()
                )


                # Keep only our four emotions.
                if detected_emotion in ALLOWED_EMOTIONS:

                    current_emotion = (
                        detected_emotion.capitalize()
                    )

                else:

                    # Unwanted expressions are grouped
                    # under Neutral for our project.
                    current_emotion = "Neutral"

                    detected_emotion = "neutral"


                # Increase the count for this emotion.
                emotion_counts[
                    detected_emotion
                ] += 1


                # Update analysis time.
                last_emotion_time = current_time


            except Exception as error:

                print(
                    "Emotion analysis error:",
                    error
                )


        # ====================================================
        # DISPLAY STATUS
        # ====================================================

        if looking_at_camera:

            eye_status = "Looking at Camera"

        else:

            eye_status = "Looking Away"


        cv2.putText(
            frame,
            eye_status,
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            f"Eye Contact: {eye_contact_percentage:.1f}%",
            (20, 75),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2
        )

        cv2.putText(
            frame,
            f"Attention: {attention_score:.1f}%",
            (20, 110),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2
        )

        cv2.putText(
            frame,
            f"Emotion: {current_emotion}",
            (20, 145),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 255),
            2
        )


    else:

        cv2.putText(
            frame,
            "No Face Detected",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255),
            2
        )


    # ========================================================
    # SHOW WEBCAM
    # ========================================================

    cv2.imshow(
        "SmartHire AI - Visual Analysis",
        frame
    )


    # Press Q to stop.
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


# ============================================================
# FINAL CALCULATIONS
# ============================================================

camera.release()

cv2.destroyAllWindows()

face_landmarker.close()


if face_frames > 0:

    final_eye_contact = (
        eye_contact_frames / face_frames
    ) * 100

    final_attention = (
        attention_frames / face_frames
    ) * 100

else:

    final_eye_contact = 0
    final_attention = 0


# ============================================================
# EMOTION DISTRIBUTION
# ============================================================

total_emotion_samples = sum(
    emotion_counts.values()
)

emotion_distribution = {}

if total_emotion_samples > 0:

    for emotion, count in emotion_counts.items():

        emotion_distribution[emotion] = round(
            (count / total_emotion_samples) * 100,
            2
        )

else:

    for emotion in ALLOWED_EMOTIONS:

        emotion_distribution[emotion] = 0


# ============================================================
# DOMINANT EMOTION
# ============================================================

if total_emotion_samples > 0:

    dominant_emotion = max(
        emotion_counts,
        key=emotion_counts.get
    )

else:

    dominant_emotion = "neutral"


# ============================================================
# FACIAL ENGAGEMENT SCORE
# ============================================================

# For now, facial engagement is based on the percentage
# of analyzed frames in which an allowed facial expression
# other than Neutral was detected.

if total_emotion_samples > 0:

    expressive_samples = (
        emotion_counts["happy"]
        + emotion_counts["fear"]
        + emotion_counts["surprise"]
    )

    facial_engagement_score = (
        expressive_samples
        / total_emotion_samples
    ) * 100

else:

    facial_engagement_score = 0


# ============================================================
# PRINT FINAL VISUAL ANALYSIS
# ============================================================

print("\n===================================")
print("SMART HIRE AI - VISUAL ANALYSIS")
print("===================================")

print(
    f"Eye Contact: "
    f"{final_eye_contact:.2f}%"
)

print(
    f"Attention Score: "
    f"{final_attention:.2f}%"
)

print(
    f"Facial Engagement: "
    f"{facial_engagement_score:.2f}%"
)

print(
    f"Dominant Emotion: "
    f"{dominant_emotion.capitalize()}"
)

print(
    "Emotion Distribution:"
)

for emotion, percentage in emotion_distribution.items():

    print(
        f"  {emotion.capitalize()}: "
        f"{percentage:.2f}%"
    )