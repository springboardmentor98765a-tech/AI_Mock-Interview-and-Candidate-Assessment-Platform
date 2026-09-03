"""
app/ml/train_engagement_rnn.py
==========================
Module 6 - CNN + RNN Interview Behavior Analysis (RNN training script)

Trains EngagementRNN (rnn.py) on programmatically generated synthetic
interview-behavior sequences and writes the weights to
app/ml/weights/engagement_rnn.npz, which engagement_engine.py loads at
import time.

WHY SYNTHETIC DATA: training a temporal model needs *sequences* of
labeled behavior, and no public dataset of labeled webcam-based
interview-attention sequences exists for this project to use. Rather
than ship an untrained (random-weights) network, this generates four
behavior "archetypes" from simple, explainable rules - engaged,
distracted, absent, and multiple-people-in-frame - sampling per-tick
face-detection / eye-contact / gaze / expression / multi-face signals
around each archetype's known statistics, and trains the RNN to map a
~30s window of those noisy per-tick signals back onto the archetype's
target scores. This is a standard way to bootstrap a sequence model
before real labeled data is available.

TO RETRAIN ON REAL DATA LATER: once real sessions have reviewer-labeled
engagement/integrity outcomes, replace generate_batch() with a loader
that reads (tick-sequence, label) pairs from your own storage and keep
everything else (the model, the training loop) the same.

Run with:  python -m app.ml.train_engagement_rnn
"""

import os
import numpy as np

from app.ml.rnn import EngagementRNN
from app.ml.features import TICK_FEATURE_SIZE, RNN_WINDOW_SIZE

WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "weights", "engagement_rnn.npz")

ARCHETYPES = ["engaged", "distracted", "absent", "multiple_people"]


def _archetype_params(archetype: str, rng: np.random.Generator):
    """Per-archetype sampling distributions + target label ranges.
    Every number here is a design choice, not a measured statistic -
    documented in the module docstring above."""
    if archetype == "engaged":
        return dict(
            face_p=0.97, eye_p=0.88, openness=(0.72, 1.0), gaze=(0.0, 0.28),
            valence=(0.55, 0.9), mult_p=0.01,
            label=lambda: np.array([rng.uniform(0.82, 1.0), rng.uniform(0.0, 0.15), rng.uniform(0.0, 0.10)]),
        )
    if archetype == "distracted":
        return dict(
            face_p=0.85, eye_p=0.33, openness=(0.40, 0.85), gaze=(0.30, 0.75),
            valence=(0.25, 0.6), mult_p=0.02,
            label=lambda: np.array([rng.uniform(0.28, 0.55), rng.uniform(0.5, 0.8), rng.uniform(0.0, 0.15)]),
        )
    if archetype == "absent":
        return dict(
            face_p=0.18, eye_p=0.10, openness=(0.0, 0.4), gaze=(0.5, 1.0),
            valence=(0.1, 0.4), mult_p=0.01,
            label=lambda: np.array([rng.uniform(0.0, 0.22), rng.uniform(0.72, 1.0), rng.uniform(0.15, 0.4)]),
        )
    # multiple_people
    return dict(
        face_p=0.90, eye_p=0.50, openness=(0.5, 0.9), gaze=(0.15, 0.6),
        valence=(0.3, 0.7), mult_p=0.65,
        label=lambda: np.array([rng.uniform(0.3, 0.6), rng.uniform(0.3, 0.6), rng.uniform(0.75, 0.97)]),
    )


def generate_sequence(archetype: str, rng: np.random.Generator, T: int = RNN_WINDOW_SIZE):
    p = _archetype_params(archetype, rng)
    seq = np.zeros((T, TICK_FEATURE_SIZE))

    for t in range(T):
        face = 1.0 if rng.random() < p["face_p"] else 0.0
        eye = 1.0 if (face and rng.random() < p["eye_p"]) else 0.0
        openness = rng.uniform(*p["openness"]) if face else 0.0
        gaze = rng.uniform(*p["gaze"]) if face else 1.0
        valence = rng.uniform(*p["valence"]) if face else 0.0
        mult = 1.0 if rng.random() < p["mult_p"] else 0.0
        seq[t] = [face, eye, openness, gaze, valence, mult]

    # Light jitter on the continuous columns so the model doesn't
    # memorize exact archetype boundaries.
    seq[:, 2:5] += rng.normal(0, 0.02, size=(T, 3))
    seq[:, 2:5] = np.clip(seq[:, 2:5], 0, 1)

    label = np.clip(p["label"]() + rng.normal(0, 0.02, size=3), 0, 1)
    return seq, label


def train(epochs=40, sequences_per_epoch=500, hidden_size=24, seed=7, verbose=True):
    rng = np.random.default_rng(seed)
    model = EngagementRNN(input_size=TICK_FEATURE_SIZE, hidden_size=hidden_size, output_size=3, seed=42)

    lr0 = 0.02
    for epoch in range(epochs):
        lr = lr0 * (0.96 ** epoch)
        epoch_loss = 0.0
        for _ in range(sequences_per_epoch):
            archetype = ARCHETYPES[rng.integers(0, len(ARCHETYPES))]
            X, y = generate_sequence(archetype, rng)
            y_pred, cache = model.forward(X)
            eps = 1e-9
            loss = -np.mean(y * np.log(y_pred.flatten() + eps) + (1 - y) * np.log(1 - y_pred.flatten() + eps))
            epoch_loss += loss
            grads = model.backward(cache, y)
            model.adam_step(grads, lr=lr, clip=5.0)

        if verbose and ((epoch + 1) % 5 == 0 or epoch == 0):
            print(f"[train_engagement_rnn] epoch {epoch + 1}/{epochs}  lr={lr:.4f}  loss={epoch_loss / sequences_per_epoch:.4f}")

    return model


def evaluate(model, samples_per_archetype=200, seed=123):
    rng = np.random.default_rng(seed)
    print("\n[train_engagement_rnn] validation - mean absolute error per archetype:")
    for archetype in ARCHETYPES:
        errs = []
        for _ in range(samples_per_archetype):
            X, y = generate_sequence(archetype, rng)
            pred = model.predict(X)
            errs.append(np.abs(pred - y))
        mae = np.mean(errs, axis=0)
        print(f"  {archetype:16s} engagement={mae[0]:.3f}  disengagement_risk={mae[1]:.3f}  integrity_risk={mae[2]:.3f}")


def main():
    os.makedirs(os.path.dirname(WEIGHTS_PATH), exist_ok=True)
    print("[train_engagement_rnn] training on synthetic behavior sequences...")
    model = train()
    evaluate(model)
    model.save(WEIGHTS_PATH)
    print(f"\n[train_engagement_rnn] saved weights -> {WEIGHTS_PATH}")


if __name__ == "__main__":
    main()
