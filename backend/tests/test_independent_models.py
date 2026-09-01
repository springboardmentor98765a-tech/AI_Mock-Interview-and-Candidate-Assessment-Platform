import os
import sys
import cv2
import torch
import numpy as np
from pathlib import Path
from PIL import Image
from torchvision import transforms

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from ml_models.train_confidence import ConfidenceCNN, load_and_preprocess_dataset
from ml_models.train_emotion import EmotionCNN
from services.vision_service import vision_service

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "ml_models"

CONFIDENCE_MODEL_PATH = MODEL_DIR / "confidence_model.pth"
EMOTION_MODEL_PATH = MODEL_DIR / "emotion_model.pth"


def test_independent_models():
    print("\n--- PART 4: INDEPENDENT MODEL INFERENCE TEST ---")

    # 1. Verify Paths
    print(f"[MODULE 6] Checking Confidence Model Path: {CONFIDENCE_MODEL_PATH} -> Exists: {CONFIDENCE_MODEL_PATH.exists()}")
    print(f"[MODULE 6] Checking Emotion Model Path: {EMOTION_MODEL_PATH} -> Exists: {EMOTION_MODEL_PATH.exists()}")

    assert CONFIDENCE_MODEL_PATH.exists(), f"Confidence model path does not exist at {CONFIDENCE_MODEL_PATH}"
    assert EMOTION_MODEL_PATH.exists(), f"Emotion model path does not exist at {EMOTION_MODEL_PATH}"

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # 2. Test Confidence Model Architecture & Inference
    conf_model = ConfidenceCNN(num_classes=2).to(device)
    conf_model.load_state_dict(torch.load(CONFIDENCE_MODEL_PATH, map_location=device))
    conf_model.eval()
    print("[MODULE 6] Confidence model loaded state_dict successfully.")

    train_samples, _, _, _ = load_and_preprocess_dataset()
    sample_conf_path = train_samples[0][0]
    conf_bgr = cv2.imread(sample_conf_path)
    assert conf_bgr is not None, f"Could not read confidence sample image at {sample_conf_path}"

    conf_rgb = cv2.cvtColor(conf_bgr, cv2.COLOR_BGR2RGB)
    pil_conf = Image.fromarray(conf_rgb)

    conf_transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    conf_tensor = conf_transform(pil_conf).unsqueeze(0).to(device)
    with torch.no_grad():
        conf_logits = conf_model(conf_tensor)
        conf_probs = torch.softmax(conf_logits, dim=1).squeeze(0).cpu().numpy()
        pred_idx = int(np.argmax(conf_probs))
        pred_label = "Confident" if pred_idx == 1 else "Unconfident"
        pred_prob = float(conf_probs[pred_idx])

    print(f"[MODULE 6] Independent Confidence Test -> Prediction: {pred_label}, Probability: {pred_prob:.4f}")
    assert pred_label in ["Confident", "Unconfident"]
    assert 0.0 <= pred_prob <= 1.0

    # 3. Test Emotion Model Architecture & Inference
    emo_model = EmotionCNN(num_classes=7).to(device)
    emo_model.load_state_dict(torch.load(EMOTION_MODEL_PATH, map_location=device))
    emo_model.eval()
    print("[MODULE 6] Emotion model loaded state_dict successfully.")

    fer_dir = Path("D:/SmartHire_Git/SmartHire_Datasets/fer_2013/train")
    fer_sample_img = list(fer_dir.rglob("*.jpg"))[0]
    emo_bgr = cv2.imread(str(fer_sample_img))
    assert emo_bgr is not None, f"Could not read FER sample image at {fer_sample_img}"

    pil_emo = Image.fromarray(cv2.cvtColor(emo_bgr, cv2.COLOR_BGR2RGB))
    emo_transform = transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        transforms.Resize((48, 48)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])
    emo_tensor = emo_transform(pil_emo).unsqueeze(0).to(device)
    with torch.no_grad():
        emo_logits = emo_model(emo_tensor)
        emo_probs = torch.softmax(emo_logits, dim=1).squeeze(0).cpu().numpy()
        emo_idx = int(np.argmax(emo_probs))
        labels = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
        emo_label = labels[emo_idx]
        emo_prob = float(emo_probs[emo_idx])

    print(f"[MODULE 6] Independent Emotion Test -> Prediction: {emo_label}, Probability: {emo_prob:.4f}")
    assert emo_label in labels
    assert 0.0 <= emo_prob <= 1.0

    # 4. Test VisionService Full Pipeline
    frame_analysis = vision_service.analyze_frame(conf_bgr)
    print(f"[MODULE 6] Full VisionService analyze_frame result: {frame_analysis}")
    assert "face_detected" in frame_analysis
    assert "confidence_prediction" in frame_analysis
    assert "emotion_prediction" in frame_analysis
    assert "mobile_detected" in frame_analysis

    print("--- PART 4 TEST SUCCESSFUL ---\n")


if __name__ == "__main__":
    test_independent_models()
