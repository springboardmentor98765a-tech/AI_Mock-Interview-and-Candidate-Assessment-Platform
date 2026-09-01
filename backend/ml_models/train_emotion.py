import os
import json
import logging
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

DEFAULT_FER_DIR = r"D:\SmartHire_Git\SmartHire_Datasets\fer_2013"
ALT_FER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "SmartHire_Datasets", "fer_2013"))

FER_DATASET_DIR = os.environ.get("FER_DATASET_DIR")
if not FER_DATASET_DIR:
    FER_DATASET_DIR = DEFAULT_FER_DIR if os.path.exists(DEFAULT_FER_DIR) else ALT_FER_DIR

MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), "emotion_model.pth")
METRICS_SAVE_PATH = os.path.join(os.path.dirname(__file__), "emotion_metrics.json")

EMOTION_CLASSES = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]


class EmotionCNN(nn.Module):
    def __init__(self, num_classes=7):
        super(EmotionCNN, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            nn.Dropout(0.25),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            nn.Dropout(0.25),

            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((4, 4)),
            nn.Dropout(0.3)
        )
        self.classifier = nn.Sequential(
            nn.Linear(256 * 4 * 4, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.4),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x


def train_emotion_model(epochs=10, batch_size=64, lr=0.001):
    train_dir = os.path.join(FER_DATASET_DIR, "train")
    test_dir = os.path.join(FER_DATASET_DIR, "test")

    if not os.path.exists(train_dir) or not os.path.exists(test_dir):
        logging.error(f"FER-2013 dataset not found at {FER_DATASET_DIR}")
        return None

    train_transform = transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        transforms.Resize((48, 48)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])

    test_transform = transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        transforms.Resize((48, 48)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])

    train_dataset = datasets.ImageFolder(train_dir, transform=train_transform)
    test_dataset = datasets.ImageFolder(test_dir, transform=test_transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = EmotionCNN(num_classes=7).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)

    logging.info(f"Training Emotion CNN on {len(train_dataset)} train samples and {len(test_dataset)} test samples...")

    best_acc = -1.0
    best_metrics = {}

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for images, targets in train_loader:
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * images.size(0)

        train_loss = running_loss / len(train_dataset)

        # Evaluation on test set
        model.eval()
        all_preds = []
        all_targets = []
        test_loss = 0.0

        with torch.no_grad():
            for images, targets in test_loader:
                images, targets = images.to(device), targets.to(device)
                outputs = model(images)
                loss = criterion(outputs, targets)
                test_loss += loss.item() * images.size(0)
                preds = torch.argmax(outputs, dim=1)
                all_preds.extend(preds.cpu().numpy())
                all_targets.extend(targets.cpu().numpy())

        test_loss /= len(test_dataset)
        acc = float(accuracy_score(all_targets, all_preds))
        prec = float(precision_score(all_targets, all_preds, average="weighted", zero_division=0))
        rec = float(recall_score(all_targets, all_preds, average="weighted", zero_division=0))
        f1 = float(f1_score(all_targets, all_preds, average="weighted", zero_division=0))
        cm = confusion_matrix(all_targets, all_preds).tolist()

        logging.info(f"Epoch {epoch}/{epochs} - Train Loss: {train_loss:.4f} - Test Loss: {test_loss:.4f} - Acc: {acc:.4f} - F1: {f1:.4f}")

        if acc >= best_acc:
            best_acc = acc
            best_metrics = {
                "accuracy": acc,
                "precision": prec,
                "recall": rec,
                "f1_score": f1,
                "confusion_matrix": cm,
                "classes": EMOTION_CLASSES,
                "epochs_trained": epoch
            }
            torch.save(model.state_dict(), MODEL_SAVE_PATH)

    os.makedirs(os.path.dirname(METRICS_SAVE_PATH), exist_ok=True)
    with open(METRICS_SAVE_PATH, "w") as f:
        json.dump(best_metrics, f, indent=2)

    logging.info(f"Emotion model saved to {MODEL_SAVE_PATH}")
    logging.info(f"Metrics saved to {METRICS_SAVE_PATH}")
    return best_metrics


if __name__ == "__main__":
    train_emotion_model(epochs=5)
