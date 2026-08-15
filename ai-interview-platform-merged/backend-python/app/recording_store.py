"""
Storage for proctored-session recordings (Recording feature).

The candidate's browser records combined video+audio locally with the
MediaRecorder API — the same webcam/mic MediaStream already used for
proctoring in interview-session.js — and uploads the finished blob
once, when the interview ends (normal finish, timeout auto-submit, or
violation auto-submit all funnel through the same finishInterview()).

Files are stored on disk, the same way resumes (Node service) and TTS
audio (tts_engine.py) already are, rather than as a bytea blob in
Postgres: a mock-interview recording can run into tens or hundreds of
MB, and storing that in the database bloats the DB file, slows down
backups/replication, and forces every read through the DB connection
pool instead of being streamed straight off disk (or, later, a CDN/
object store). The `interview_recordings` table stays the source of
truth for *metadata and access control* — which interview a recording
belongs to, its size/duration, and (via the route handlers) who is
allowed to open it — while the bytes themselves live here.
"""
import logging
import shutil
import subprocess
from pathlib import Path
from typing import Optional

from app.config import RECORDINGS_DIR

logger = logging.getLogger("recording_store")

MEDIA_TYPES = {
    ".webm": "video/webm",
    ".mp4": "video/mp4",
    ".ogg": "video/ogg",
}
EXTENSION_FOR_MIME = {v: k for k, v in MEDIA_TYPES.items()}

# Audio-only sidecar extracted from the uploaded video (see
# extract_audio_track below). Matched to a container each source
# format can hold without re-encoding the audio codec: webm/ogg videos
# hold Opus/Vorbis audio, which come out as .ogg; mp4 holds AAC, which
# comes out as .m4a.
AUDIO_EXT_FOR_VIDEO_MIME = {
    "video/webm": ".ogg",
    "video/ogg": ".ogg",
    "video/mp4": ".m4a",
}
AUDIO_MEDIA_TYPES = {
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
}


def _interview_dir(interview_id: int) -> Path:
    d = RECORDINGS_DIR / f"interview_{interview_id}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def recording_path(interview_id: int, mime_type: str) -> Path:
    """Destination path for a new recording upload. One file per
    interview — a fresh upload replaces whatever was there before."""
    ext = EXTENSION_FOR_MIME.get(mime_type, ".webm")
    return _interview_dir(interview_id) / f"session{ext}"


def delete_existing_recording(interview_id: int) -> None:
    """Removes any previous recording file(s) for this interview
    before a new upload replaces it, so a retried/duplicate upload
    (e.g. a page reload right after finishing) can't leave stray
    files with different extensions sitting around."""
    d = _interview_dir(interview_id)
    if not d.exists():
        return
    for f in d.glob("session.*"):
        try:
            f.unlink()
        except OSError as exc:
            logger.warning("Could not remove old recording %s: %s", f, exc)


def media_type_for(path: Path) -> str:
    return MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")


def audio_path(interview_id: int, video_mime_type: str) -> Path:
    """Destination path for the audio-only sidecar of a given video
    upload — same folder, same base name, audio-appropriate extension."""
    ext = AUDIO_EXT_FOR_VIDEO_MIME.get(video_mime_type, ".ogg")
    return _interview_dir(interview_id) / f"session_audio{ext}"


def extract_audio_track(video_path: Path, interview_id: int, video_mime_type: str) -> Optional[Path]:
    """Pulls the audio track out of the uploaded video into its own
    file, so anything that only needs audio (e.g. a future transcript
    feature) doesn't have to demux the combined recording itself.

    Uses ffmpeg with `-c:a copy` (no re-encoding — just repackaging the
    existing audio stream), so this is fast and lossless. Returns None,
    logging a warning instead of raising, if ffmpeg isn't installed or
    the video has no audio track — a missing audio sidecar should never
    fail the (already-successful) video upload.
    """
    if shutil.which("ffmpeg") is None:
        logger.warning("ffmpeg not found on PATH — skipping audio extraction for interview %s", interview_id)
        return None

    dest = audio_path(interview_id, video_mime_type)
    dest.unlink(missing_ok=True)

    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", str(video_path), "-vn", "-c:a", "copy", str(dest)],
            capture_output=True,
            timeout=120,
        )
    except (subprocess.TimeoutExpired, OSError) as exc:
        logger.warning("Audio extraction failed for interview %s: %s", interview_id, exc)
        return None

    if result.returncode != 0 or not dest.exists() or dest.stat().st_size == 0:
        logger.warning(
            "Audio extraction produced no output for interview %s: %s",
            interview_id,
            result.stderr.decode(errors="replace")[-500:] if result.stderr else "",
        )
        dest.unlink(missing_ok=True)
        return None

    return dest


def audio_media_type_for(path: Path) -> str:
    return AUDIO_MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")


def delete_existing_audio(interview_id: int) -> None:
    """Mirrors delete_existing_recording for the audio sidecar, so a
    replaced video upload doesn't leave a stale audio file with a
    different extension sitting around."""
    d = _interview_dir(interview_id)
    if not d.exists():
        return
    for f in d.glob("session_audio.*"):
        try:
            f.unlink()
        except OSError as exc:
            logger.warning("Could not remove old audio file %s: %s", f, exc)
