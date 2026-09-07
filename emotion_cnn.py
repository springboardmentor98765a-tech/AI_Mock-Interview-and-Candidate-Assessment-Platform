"""
Emotion CNN Model Module
Defines the Convolutional Neural Network architecture for facial emotion prediction,
image preprocessing, model weights management, and inference.

Classes:
1. Nervous
2. Scared
3. Confused

DISCLAIMER: These classifications represent observable facial expression model estimates
and do NOT constitute definitive psychological or emotional diagnoses.
"""

import os
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

EMOTION_CLASSES = ["Nervous", "Scared", "Confused"]
INPUT_SIZE = (48, 48)

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
CHECKPOINT_PATH = os.path.join(MODEL_DIR, "emotion_cnn.pth")


class EmotionCNN(nn.Module):
    """
    CNN Architecture for 3-class facial expression estimation.
    Architecture:
      Input (1 x 48 x 48)
      -> Conv2D(1, 32, 3) -> BatchNorm -> ReLU -> MaxPool2D(2) -> Dropout(0.25)
      -> Conv2D(32, 64, 3) -> BatchNorm -> ReLU -> MaxPool2D(2) -> Dropout(0.25)
      -> Conv2D(64, 128, 3) -> BatchNorm -> ReLU -> MaxPool2D(2) -> Dropout(0.25)
      -> Flatten
      -> Linear(128 * 6 * 6, 256) -> ReLU -> Dropout(0.5)
      -> Linear(256, 3)
    """

    def __init__(self, num_classes=3):
        super(EmotionCNN, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        self.pool1 = nn.MaxPool2d(2, 2)
        self.drop1 = nn.Dropout2d(0.25)

        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.pool2 = nn.MaxPool2d(2, 2)
        self.drop2 = nn.Dropout2d(0.25)

        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(128)
        self.pool3 = nn.MaxPool2d(2, 2)
        self.drop3 = nn.Dropout2d(0.25)

        self.fc1 = nn.Linear(128 * 6 * 6, 256)
        self.drop_fc = nn.Dropout(0.5)
        self.fc2 = nn.Linear(256, num_classes)

    def forward(self, x):
        x = self.drop1(self.pool1(F.relu(self.bn1(self.conv1(x)))))
        x = self.drop2(self.pool2(F.relu(self.bn2(self.conv2(x)))))
        x = self.drop3(self.pool3(F.relu(self.bn3(self.conv3(x)))))
        x = x.view(x.size(0), -1)
        x = self.drop_fc(F.relu(self.fc1(x)))
        x = self.fc2(x)
        return x


class EmotionPipeline:
    """
    Manages CNN emotion inference, preprocessing, and model lifecycle state.
    """

    def __init__(self, checkpoint_path=CHECKPOINT_PATH):
        self.checkpoint_path = checkpoint_path
        self.classes = EMOTION_CLASSES
        self.model = EmotionCNN(num_classes=len(self.classes))
        self.model.eval()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.model_status = "uninitialized"
        self._load_weights()

    def _load_weights(self):
        if os.path.exists(self.checkpoint_path):
            try:
                state_dict = torch.load(self.checkpoint_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.model.eval()
                self.model_status = "trained_loaded"
            except Exception as e:
                self.model_status = f"load_error: {str(e)}"
        else:
            # Model initialized with architecture, status clearly marked
            self.model_status = "model_not_trained"

    def get_status(self):
        return {
            "status": self.model_status,
            "classes": self.classes,
            "device": str(self.device),
            "checkpoint_path": self.checkpoint_path,
            "checkpoint_exists": os.path.exists(self.checkpoint_path),
            "disclaimer": "Emotion predictions are observable facial expression estimates and not definitive psychological states."
        }

    def preprocess_face(self, face_img_bgr_or_gray):
        """
        Preprocesses a cropped face image for CNN inference.
        1. Convert to Grayscale if 3-channel
        2. Resize to 48x48
        3. Normalize pixel values to [-1.0, 1.0]
        4. Convert to PyTorch Tensor of shape (1, 1, 48, 48)
        """
        import cv2

        if face_img_bgr_or_gray is None or face_img_bgr_or_gray.size == 0:
            return None

        # Convert to grayscale
        if len(face_img_bgr_or_gray.shape) == 3:
            gray = cv2.cvtColor(face_img_bgr_or_gray, cv2.COLOR_BGR2GRAY)
        else:
            gray = face_img_bgr_or_gray.copy()

        # Resize to standard CNN input size
        resized = cv2.resize(gray, INPUT_SIZE, interpolation=cv2.INTER_AREA)

        # Normalize to [-1.0, 1.0]
        norm = (resized.astype(np.float32) / 127.5) - 1.0

        # Convert to Tensor (Batch=1, Channels=1, Height=48, Width=48)
        tensor = torch.from_numpy(norm).unsqueeze(0).unsqueeze(0).float()
        return tensor.to(self.device)

    def predict(self, face_img):
        """
        Infers emotion class and confidence score on a cropped face.
        Returns:
          {
            "emotion": "Nervous" | "Scared" | "Confused" | None,
            "confidence": float (0.0 to 1.0),
            "probabilities": { "Nervous": float, "Scared": float, "Confused": float },
            "model_status": self.model_status
          }
        """
        if face_img is None:
            return {
                "emotion": None,
                "confidence": 0.0,
                "probabilities": {c: 0.0 for c in self.classes},
                "model_status": "no_face_provided"
            }

        tensor = self.preprocess_face(face_img)
        if tensor is None:
            return {
                "emotion": None,
                "confidence": 0.0,
                "probabilities": {c: 0.0 for c in self.classes},
                "model_status": "preprocessing_failed"
            }

        with torch.no_grad():
            logits = self.model(tensor)
            probs = F.softmax(logits, dim=1).cpu().numpy()[0]

        top_idx = int(np.argmax(probs))
        top_emotion = self.classes[top_idx]
        top_conf = round(float(probs[top_idx]), 4)

        prob_dict = {
            self.classes[i]: round(float(probs[i]), 4)
            for i in range(len(self.classes))
        }

        return {
            "emotion": top_emotion,
            "confidence": top_conf,
            "probabilities": prob_dict,
            "model_status": self.model_status
        }


# Global singleton instance
emotion_pipeline = EmotionPipeline()
