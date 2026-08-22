from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
import tempfile
import os

app = FastAPI(title="SmartHire Whisper Service")
MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")
model = WhisperModel(
    MODEL_SIZE,
    device=os.getenv("WHISPER_DEVICE", "cpu"),
    compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE, "word_confidence": True}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    suffix = os.path.splitext(audio.filename or ".webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        f.write(await audio.read())
        path = f.name

    try:
        segments, _ = model.transcribe(
            path,
            vad_filter=True,
            word_timestamps=True,
        )
        segment_list = list(segments)
        text = " ".join(s.text.strip() for s in segment_list).strip()

        segment_scores = []
        word_scores = []
        total_duration = 0.0
        for seg in segment_list:
            start = float(getattr(seg, "start", 0.0) or 0.0)
            end = float(getattr(seg, "end", start) or start)
            total_duration = max(total_duration, end)
            lp = float(getattr(seg, "avg_logprob", -2.0))
            segment_score = max(0.0, min(1.0, (lp + 2.5) / 2.5))
            segment_scores.append(segment_score)

            for word in getattr(seg, "words", []) or []:
                probability = getattr(word, "probability", None)
                if probability is not None:
                    word_scores.append(max(0.0, min(1.0, float(probability))))

        confidence_samples = word_scores or segment_scores
        confidence = (
            round((sum(confidence_samples) / len(confidence_samples)) * 100, 2)
            if confidence_samples
            else 0
        )
        word_confidence = (
            round((sum(word_scores) / len(word_scores)) * 100, 2)
            if word_scores
            else confidence
        )

        return {
            "text": text,
            "transcript": text,
            "provider": "faster-whisper",
            "confidence": confidence,
            "wordConfidence": word_confidence,
            "segments": len(segment_list),
            "durationSeconds": round(total_duration, 2),
            "pronunciationMetric": "word-confidence-and-transcription-clarity",
        }
    finally:
        try:
            os.remove(path)
        except OSError:
            pass
