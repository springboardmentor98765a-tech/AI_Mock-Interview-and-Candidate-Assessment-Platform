import os
import re
import glob
import json
import logging
import pandas as pd
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

DEFAULT_CONF_DIR = r"D:\SmartHire_Git\SmartHire_Datasets\Confidence_dataset\data"
ALT_CONF_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "SmartHire_Datasets", "Confidence_dataset", "data"))

CONFIDENCE_DATASET_DIR = os.environ.get("CONFIDENCE_DATASET_DIR")
if not CONFIDENCE_DATASET_DIR:
    CONFIDENCE_DATASET_DIR = DEFAULT_CONF_DIR if os.path.exists(DEFAULT_CONF_DIR) else ALT_CONF_DIR

MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), "confidence_model.pth")
METRICS_SAVE_PATH = os.path.join(os.path.dirname(__file__), "confidence_metrics.json")


class ConfidenceDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, torch.tensor(label, dtype=torch.long)


class ConfidenceCNN(nn.Module):
    def __init__(self, num_classes=2):
        super(ConfidenceCNN, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),

            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((4, 4))
        )
        self.classifier = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(256 * 4 * 4, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x


def load_and_preprocess_dataset():
    candidate_frames_dir = os.path.join(CONFIDENCE_DATASET_DIR, "candidate_frames")
    labeled_dataset_dir = os.path.join(CONFIDENCE_DATASET_DIR, "labeled_dataset")

    if not os.path.exists(candidate_frames_dir) or not os.path.exists(labeled_dataset_dir):
        logging.error(f"Dataset path not found: {CONFIDENCE_DATASET_DIR}")
        return [], [], [], {}

    csv_files = sorted(glob.glob(os.path.join(labeled_dataset_dir, "*.csv")))
    stats = {
        "total_csv_rows": 0,
        "matched_samples": 0,
        "missing_images": 0,
        "invalid_rows": 0,
        "unmatched_entries": 0,
        "train_samples_count": 0,
        "val_samples_count": 0,
        "test_samples_count": 0,
        "class_distribution": {"0_unconfident": 0, "1_confident": 0}
    }

    train_samples = []
    val_samples = []
    test_samples = []

    # 3-Way Candidate-Aware Grouped Split:
    # Train: Candidates C01 to C17
    # Validation: Candidates C18 to C22
    # Independent Test: Candidates C23 to C28
    val_candidates = {f"C{i:02d}" for i in range(18, 23)}
    test_candidates = {f"C{i:02d}" for i in range(23, 29)}

    for csv_file in csv_files:
        cand_id = os.path.basename(csv_file).replace(".csv", "").strip()
        cand_img_dir = os.path.join(candidate_frames_dir, cand_id)

        try:
            df = pd.read_csv(csv_file)
            df.columns = [str(c).strip() for c in df.columns]
        except Exception as e:
            logging.warning(f"Could not read {csv_file}: {e}")
            continue

        label_col = next((c for c in df.columns if c.lower() == "label"), None)
        frame_col = next((c for c in df.columns if "frame" in c.lower()), None)

        if label_col is None:
            logging.warning(f"No Label column found in {csv_file}")
            continue

        existing_files = set(os.listdir(cand_img_dir)) if os.path.exists(cand_img_dir) else set()
        file_map_lower = {f.lower(): f for f in existing_files}

        for idx, row in df.iterrows():
            stats["total_csv_rows"] += 1
            lbl_val = row[label_col]

            if pd.isna(lbl_val):
                stats["invalid_rows"] += 1
                continue

            try:
                label = int(float(lbl_val))
                if label not in (0, 1):
                    stats["invalid_rows"] += 1
                    continue
            except (ValueError, TypeError):
                stats["invalid_rows"] += 1
                continue

            raw_frame_val = str(row[frame_col]) if frame_col else str(idx + 1)
            num_match = re.search(r"\d+", raw_frame_val)
            n_str = num_match.group(0) if num_match else str(idx + 1)

            candidate_image_names = [
                raw_frame_val,
                f"{raw_frame_val}.jpg",
                f"{raw_frame_val}.png",
                f"frame{n_str}.jpg",
                f"frame{n_str}.png",
                f"frame_{n_str}.jpg",
                f"frame_{n_str}.png",
                f"{cand_id.lower()}_face{n_str}.jpg",
                f"{cand_id.lower()}_face{n_str}.png",
                f"{n_str}.jpg",
                f"{n_str}.png"
            ]

            matched_filename = None
            for name in candidate_image_names:
                if name.lower() in file_map_lower:
                    matched_filename = file_map_lower[name.lower()]
                    break

            if matched_filename:
                matched_path = os.path.join(cand_img_dir, matched_filename)
                stats["matched_samples"] += 1
                if label == 1:
                    stats["class_distribution"]["1_confident"] += 1
                else:
                    stats["class_distribution"]["0_unconfident"] += 1

                sample = (matched_path, label)
                if cand_id in val_candidates:
                    val_samples.append(sample)
                elif cand_id in test_candidates:
                    test_samples.append(sample)
                else:
                    train_samples.append(sample)
            else:
                stats["missing_images"] += 1
                stats["unmatched_entries"] += 1

    stats["train_samples_count"] = len(train_samples)
    stats["val_samples_count"] = len(val_samples)
    stats["test_samples_count"] = len(test_samples)

    logging.info(f"Confidence Dataset Preprocessing Stats: {stats}")
    return train_samples, val_samples, test_samples, stats


def evaluate_model_on_loader(model, loader, device):
    model.eval()
    all_preds = []
    all_targets = []
    with torch.no_grad():
        for images, targets in loader:
            images, targets = images.to(device), targets.to(device)
            outputs = model(images)
            preds = torch.argmax(outputs, dim=1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())

    acc = float(accuracy_score(all_targets, all_preds))
    prec = float(precision_score(all_targets, all_preds, zero_division=0))
    rec = float(recall_score(all_targets, all_preds, zero_division=0))
    f1 = float(f1_score(all_targets, all_preds, zero_division=0))
    cm = confusion_matrix(all_targets, all_preds).tolist()

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": cm
    }


def train_confidence_model(epochs=8, batch_size=32, lr=0.001):
    train_samples, val_samples, test_samples, stats = load_and_preprocess_dataset()

    if not train_samples:
        logging.error("No valid training samples found for Confidence dataset.")
        return None

    train_transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    train_loader = DataLoader(ConfidenceDataset(train_samples, train_transform), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(ConfidenceDataset(val_samples, val_transform), batch_size=batch_size, shuffle=False) if val_samples else None
    test_loader = DataLoader(ConfidenceDataset(test_samples, val_transform), batch_size=batch_size, shuffle=False) if test_samples else None

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = ConfidenceCNN(num_classes=2).to(device)

    # Class imbalance handling
    labels = [s[1] for s in train_samples]
    num_unconfident = sum(1 for l in labels if l == 0)
    num_confident = sum(1 for l in labels if l == 1)
    
    pos_weight = (num_unconfident / max(1, num_confident)) if num_unconfident > 0 else 1.0
    class_weights = torch.tensor([1.0, pos_weight], dtype=torch.float).to(device)
    
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)

    logging.info(f"Training Confidence CNN on {len(train_samples)} train, {len(val_samples)} val, {len(test_samples)} test samples on device {device}...")

    best_f1 = -1.0
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

        train_loss = running_loss / len(train_samples)

        # Validation
        if val_loader:
            val_eval = evaluate_model_on_loader(model, val_loader, device)
            f1 = val_eval["f1_score"]
            logging.info(f"Epoch {epoch}/{epochs} - Train Loss: {train_loss:.4f} - Val Acc: {val_eval['accuracy']} - Val F1: {f1}")

            if f1 >= best_f1:
                best_f1 = f1
                best_metrics = {
                    "validation_metrics": val_eval,
                    "preprocessing_stats": stats,
                    "epochs_trained": epoch
                }
                torch.save(model.state_dict(), MODEL_SAVE_PATH)
        else:
            torch.save(model.state_dict(), MODEL_SAVE_PATH)

    # Independent Test Set Evaluation
    if os.path.exists(MODEL_SAVE_PATH) and test_loader:
        model.load_state_dict(torch.load(MODEL_SAVE_PATH, map_location=device))
        test_eval = evaluate_model_on_loader(model, test_loader, device)
        best_metrics["independent_test_metrics"] = test_eval
        logging.info(f"Independent Test Set Evaluation: {test_eval}")

    os.makedirs(os.path.dirname(METRICS_SAVE_PATH), exist_ok=True)
    with open(METRICS_SAVE_PATH, "w") as f:
        json.dump(best_metrics or {"status": "trained_without_val"}, f, indent=2)

    logging.info(f"PyTorch Confidence model saved to {MODEL_SAVE_PATH}")
    logging.info(f"Metrics saved to {METRICS_SAVE_PATH}")
    return best_metrics


if __name__ == "__main__":
    train_confidence_model(epochs=5)
