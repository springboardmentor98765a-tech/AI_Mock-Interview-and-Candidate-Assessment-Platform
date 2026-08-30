from app.emotion_analysis import predict_face_emotion
import cv2

image_path = "test_face.jpg"

image = cv2.imread(
    image_path,
    cv2.IMREAD_GRAYSCALE
)

if image is None:
    raise FileNotFoundError(
        f"Could not read {image_path}"
    )

result = predict_face_emotion(
    image
)

print("\nEmotion prediction")
print("==================")

print(
    "Dominant:",
    result["dominant_emotion"]
)

print("\nProbabilities:")

for emotion, probability in result[
    "probabilities"
].items():

    print(
        f"{emotion:10s}: "
        f"{probability:.4f}"
    )
