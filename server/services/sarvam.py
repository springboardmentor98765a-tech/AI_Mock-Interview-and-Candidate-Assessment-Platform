"""Sarvam AI integration for Text-to-Speech (Bulbul V3) and Speech-to-Text (Saaras V3)."""
import base64
import json
import io
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from config import SARVAM_API_KEY, SARVAM_BASE_URL


class SarvamError(RuntimeError):
    pass


def configured() -> bool:
    return bool(SARVAM_API_KEY)


# ── Text-to-Speech (Bulbul V3) ──────────────────────────────────────────────

def text_to_speech(text: str, language_code: str = "en-IN", speaker: str = "shubh") -> str:
    """Convert text to speech using Sarvam Bulbul V3.

    Returns base64-encoded WAV audio data (without the data-URL prefix).
    """
    if not configured():
        raise SarvamError("Sarvam AI is not configured. Add SARVAM_API_KEY to server/.env and restart FastAPI.")

    # Bulbul V3 has a 2500 character limit per request
    truncated_text = text[:2500] if len(text) > 2500 else text

    payload = json.dumps({
        "text": truncated_text,
        "language_code": language_code,
        "model": "bulbul:v3",
        "speaker": speaker,
        "properties": {
            "pace": 1.0,
        },
    }).encode("utf-8")

    request = Request(
        f"{SARVAM_BASE_URL}/text-to-speech",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "api-subscription-key": SARVAM_API_KEY,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code in (401, 403):
            raise SarvamError("Sarvam AI credentials were rejected. Check SARVAM_API_KEY in server/.env.") from error
        raise SarvamError(f"Sarvam TTS request failed ({error.code}). Please try again shortly.") from error
    except URLError as error:
        raise SarvamError("Could not reach the Sarvam AI API.") from error

    try:
        audios = result["audios"]
        if not audios or not audios[0]:
            raise SarvamError("Sarvam TTS returned empty audio data.")
        return audios[0]
    except (KeyError, IndexError, TypeError) as error:
        raise SarvamError("Sarvam TTS returned an unexpected response.") from error


# ── Speech-to-Text (Saaras V3) ──────────────────────────────────────────────

def _build_multipart(fields: dict[str, str | tuple], boundary: str) -> bytes:
    """Build a multipart/form-data body from fields.

    Each value is either a plain string (text field) or a tuple of
    (filename, content_bytes, content_type) for file fields.
    """
    parts = []
    for name, value in fields.items():
        if isinstance(value, tuple):
            filename, data, content_type = value
            parts.append(
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
                f"Content-Type: {content_type}\r\n\r\n"
            )
            parts.append(data)
            parts.append(b"\r\n")
        else:
            parts.append(
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
                f"{value}\r\n"
            )
    parts.append(f"--{boundary}--\r\n")

    body = b""
    for part in parts:
        body += part.encode("utf-8") if isinstance(part, str) else part
    return body


def transcribe_audio(audio_data: str) -> str:
    """Transcribe browser-recorded audio using Sarvam Saaras V3.

    Accepts a data URL (data:audio/wav;base64,...) as recorded by the browser.
    Returns the transcribed text.
    """
    if not configured():
        raise SarvamError("Sarvam AI is not configured. Add SARVAM_API_KEY to server/.env and restart FastAPI.")

    # Extract raw bytes from the data URL
    if "," in audio_data:
        header, b64_body = audio_data.split(",", 1)
    else:
        b64_body = audio_data

    try:
        raw_bytes = base64.b64decode(b64_body, validate=True)
    except (ValueError, IndexError) as error:
        raise SarvamError("The recorded audio is invalid.") from error

    if len(raw_bytes) < 44:
        raise SarvamError("The recorded audio is too short to transcribe.")

    boundary = uuid.uuid4().hex
    fields = {
        "file": ("recording.wav", raw_bytes, "audio/wav"),
        "model": "saaras:v3",
        "mode": "transcribe",
    }

    body = _build_multipart(fields, boundary)
    request = Request(
        f"{SARVAM_BASE_URL}/speech-to-text",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "api-subscription-key": SARVAM_API_KEY,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code in (401, 403):
            raise SarvamError("Sarvam AI credentials were rejected. Check SARVAM_API_KEY in server/.env.") from error
        raise SarvamError(f"Sarvam STT request failed ({error.code}). Please try again shortly.") from error
    except URLError as error:
        raise SarvamError("Could not reach the Sarvam AI API.") from error

    try:
        transcript = result.get("transcript", "").strip()
        if not transcript:
            raise SarvamError("Sarvam STT could not transcribe the audio. Please speak louder and try again.")
        return transcript
    except AttributeError as error:
        raise SarvamError("Sarvam STT returned an unexpected response.") from error
