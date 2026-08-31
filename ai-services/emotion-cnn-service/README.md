# SmartHire Custom CNN Emotion Service

This service implements the Module 6 assignment requirement for a custom CNN with three exact emotion classes:

- Nervous
- Scared
- Confused

The model architecture is explicitly:

Input -> Conv2D -> ReLU -> MaxPooling -> Conv2D -> ReLU -> MaxPooling -> Conv2D -> ReLU -> MaxPooling -> Flatten -> Dense -> Softmax

## Dataset policy

The repository does NOT bundle random images or silently rename other emotion labels. The required training dataset must contain genuinely annotated examples of the three exact classes.

A consent-based webcam collector is included for creating a custom dataset:

```bash
python training/collect_dataset.py --class-name Nervous --count 200
python training/collect_dataset.py --class-name Scared --count 200
python training/collect_dataset.py --class-name Confused --count 200
```

Then train:

```bash
python training/train.py --data dataset --output model/emotion_cnn.keras --epochs 25
```

The service only loads `model/emotion_cnn.keras` when it exists. Until a genuine three-class model is trained, `/health` reports `degraded` and `/analyze` returns `model_ready=false` rather than fabricated predictions.

## Dataset references

The McGill Face Database is a legitimate source of complex facial mental-state expressions and explicitly includes labels such as Confused and Nervous. Access is controlled by the dataset maintainers, so the project does not redistribute those images. See the project documentation for the official source.

The MovieGraphs/EmoTx work also reports exact emotion/mental-state labels including nervous, scared, and confused, but its primary task is movie-scene emotion understanding rather than a ready-made three-class face-crop dataset. It is therefore documented as a research reference rather than silently converted into facial labels.

## Exact training workflow

1. Collect or place genuinely labeled images in `raw-data/Nervous`, `raw-data/Scared`, and `raw-data/Confused`.
2. Split them with:

```bash
python training/split_dataset.py --raw raw-data --out dataset
```

3. Train and evaluate:

```bash
python training/train.py --data dataset --output model/emotion_cnn.keras --epochs 25
```

The trainer reports validation and held-out test accuracy in `model/training_metadata.json`.

The inference service refuses to fabricate a prediction when `emotion_cnn.keras` is absent.
