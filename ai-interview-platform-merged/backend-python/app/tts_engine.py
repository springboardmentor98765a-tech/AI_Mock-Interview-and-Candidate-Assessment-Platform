"""
Text-to-Speech for interview questions.

Primary engine: gTTS (Google Text-to-Speech) — free, no API key,
natural-sounding, but needs internet access at generation time.

Fallback engine: pyttsx3 — fully offline, uses the OS's local speech
driver, used automatically if gTTS fails (no network, blocked, etc.)
so "Play question" never hard-fails just because the box has no
internet.

Generated audio is cached on disk (one file per interview question)
so repeated plays / repeated candidates re-listening never regenerate
audio that already exists.
"""
import glob
import logging
from pathlib import Path
from typing import Optional

from app.config import TTS_CACHE_DIR, TTS_LANG, TTS_TLD

logger = logging.getLogger("tts_engine")

MEDIA_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
}


def _question_dir(interview_id: int) -> Path:
    d = TTS_CACHE_DIR / f"interview_{interview_id}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _existing_file(interview_id: int, question_id: int) -> Optional[Path]:
    matches = glob.glob(str(_question_dir(interview_id) / f"q_{question_id}.*"))
    return Path(matches[0]) if matches else None


def _synthesize_gtts(text: str, out_path: Path) -> bool:
    try:
        from gtts import gTTS

        tts = gTTS(text=text, lang=TTS_LANG, tld=TTS_TLD)
        tts.save(str(out_path))
        return True
    except Exception as exc:  # noqa: BLE001 - any failure should trigger the offline fallback
        logger.warning("gTTS synthesis failed, falling back to pyttsx3: %s", exc)
        return False


def _synthesize_pyttsx3(text: str, out_path: Path) -> bool:
    try:
        import pyttsx3

        engine = pyttsx3.init()
        engine.save_to_file(text, str(out_path))
        engine.runAndWait()
        return out_path.exists()
    except Exception as exc:  # noqa: BLE001
        logger.error("pyttsx3 synthesis also failed: %s", exc)
        return False


def get_or_create_question_audio(interview_id: int, question_id: int, text: str) -> Path:
    """Returns a cached audio file for this question, generating it
    (gTTS -> pyttsx3 fallback) the first time it's requested."""
    cached = _existing_file(interview_id, question_id)
    if cached and cached.stat().st_size > 0:
        return cached

    directory = _question_dir(interview_id)
    mp3_path = directory / f"q_{question_id}.mp3"
    if _synthesize_gtts(text, mp3_path):
        return mp3_path

    wav_path = directory / f"q_{question_id}.wav"
    if _synthesize_pyttsx3(text, wav_path):
        return wav_path

    raise RuntimeError(
        "Could not generate speech audio (no internet for gTTS and no local "
        "speech driver available for pyttsx3)."
    )


def media_type_for(path: Path) -> str:
    return MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")
