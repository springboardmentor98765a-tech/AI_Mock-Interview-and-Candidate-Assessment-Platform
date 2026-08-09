"""Speech-to-text service: Gemini 2.0 Flash (multiple API keys) → Sarvam Saaras V3 fallback."""
import base64
import json
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from config import (
    GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEY_4,
    GEMINI_MODEL, SARVAM_API_KEY, SARVAM_BASE_URL,
)

GEMINI_KEYS = [k for k in [GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEY_4] if k]


class STTError(RuntimeError):
    pass


def _gemini_transcribe(audio_base64: str, mime_type: str, api_key: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    payload = json.dumps({
        "contents": [{"parts": [
            {"text": "Transcribe this audio exactly as spoken. Return ONLY the transcribed text, nothing else."},
            {"inline_data": {"mime_type": mime_type, "data": audio_base64}}
        ]}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 4096}
    }).encode("utf-8")
    request = Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(request, timeout=30) as response:
        result = json.loads(response.read().decode("utf-8"))
    parts = result["candidates"][0]["content"]["parts"]
    return " ".join(p["text"] for p in parts if p.get("text")).strip()


def _build_multipart(fields, boundary):
    parts = []
    for name, value in fields.items():
        if isinstance(value, tuple):
            filename, data, content_type = value
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\nContent-Type: {content_type}\r\n\r\n'.encode())
            parts.append(data)
            parts.append(b'\r\n')
        else:
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    parts.append(f'--{boundary}--\r\n'.encode())
    return b''.join(parts)


def _sarvam_transcribe(audio_base64: str, mime_type: str) -> str:
    raw_bytes = base64.b64decode(audio_base64)
    if len(raw_bytes) < 44:
        raise STTError("Audio too short.")
    boundary = uuid.uuid4().hex
    ext = "webm" if "webm" in mime_type else "wav"
    fields = {
        "file": (f"recording.{ext}", raw_bytes, mime_type),
        "model": "saaras:v3",
        "mode": "transcribe",
        "language_code": "en-IN",
    }
    body = _build_multipart(fields, boundary)
    request = Request(
        f"{SARVAM_BASE_URL}/speech-to-text",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "api-subscription-key": SARVAM_API_KEY},
        method="POST",
    )
    with urlopen(request, timeout=60) as response:
        result = json.loads(response.read().decode("utf-8"))
    transcript = result.get("transcript", "").strip()
    if not transcript:
        raise STTError("Sarvam returned empty transcript.")
    return transcript


def transcribe_audio(audio_base64: str, mime_type: str = "audio/wav") -> str:
    """Transcribe audio trying each Gemini API key, then fall back to Sarvam."""
    errors = []

    for i, key in enumerate(GEMINI_KEYS):
        try:
            return _gemini_transcribe(audio_base64, mime_type, key)
        except Exception as e:
            errors.append(f"Gemini key {i + 1}: {e}")

    if SARVAM_API_KEY:
        try:
            return _sarvam_transcribe(audio_base64, mime_type)
        except Exception as e:
            errors.append(f"Sarvam: {e}")

    raise STTError("Transcription failed: " + "; ".join(errors))
