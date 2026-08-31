# Section 6 — Emotion Detection & Eye Tracking

The final project now captures real-time DeepFace and MediaPipe provider results, aggregates monitoring samples across the session, persists monitoring evidence, and feeds averaged eye-contact and facial-engagement signals into the final confidence score. Reports expose provider/sample evidence so a completed interview can distinguish real provider samples from safe fallback samples.


## Real-only monitoring safety update
Real DeepFace and MediaPipe are now the only runtime monitoring providers. When either provider is unavailable, the application enters DEGRADED mode and exposes Unavailable values; it does not synthesize monitoring scores. NO_FACE/MULTIPLE_FACES malpractice enforcement only operates on valid real MediaPipe face-count samples, so AI service outages cannot create false malpractice violations.
