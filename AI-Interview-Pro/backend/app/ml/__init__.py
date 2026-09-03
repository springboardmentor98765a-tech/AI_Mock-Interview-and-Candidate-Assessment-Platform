"""
app/ml
==========================
Module 6 - CNN + RNN Interview Behavior Analysis.

    rnn.py                  from-scratch NumPy Elman RNN (temporal stage)
    features.py             shared tick-vector contract with the frontend CNN stage
    train_engagement_rnn.py trains rnn.py on synthetic behavior sequences
    engagement_engine.py    per-session rolling window + inference + proctoring flags
    weights/                trained .npz weights loaded at import time

See engagement_engine.py for the entry point used by the API routes.
"""
