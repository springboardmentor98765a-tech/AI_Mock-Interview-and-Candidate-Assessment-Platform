"""
backend/ai/stt_service.py

Persistent Faster-Whisper STT HTTP service.

- Loads Whisper Small ONCE at startup (CUDA / float16).
- Accepts POST /transcribe with multipart/form-data field name "audio".
- Returns JSON: { "transcript": "...", "language": "...", "language_probability": 0.0 }
- On error returns JSON: { "error": "description" }
- Cleans up every temporary audio file after transcription.
- Accepts GET /health for liveness checks.

Usage:
    python stt_service.py [--port 8765] [--model small] [--device cuda]

Python 3.13 stdlib only (no Flask/FastAPI needed).
Audio decoding: faster_whisper uses CTranslate2 -> ffmpeg under the hood
via the av (PyAV) library for container demuxing.
"""

import argparse
import json
import os
import sys
import tempfile
import time
from email import message_from_bytes
from http.server import BaseHTTPRequestHandler, HTTPServer

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args():
    p = argparse.ArgumentParser(description="Faster-Whisper STT HTTP service")
    p.add_argument("--port",   type=int, default=8765,  help="Port to listen on (default: 8765)")
    p.add_argument("--model",  type=str, default="small", help="Whisper model size (default: small)")
    p.add_argument("--device", type=str, default="cuda",  help="Device: cuda or cpu (default: cuda)")
    p.add_argument("--compute-type", dest="compute_type", type=str,
                   default="float16", help="CTranslate2 compute type (default: float16)")
    return p.parse_args()

# ---------------------------------------------------------------------------
# Model — loaded once at module level after args are parsed
# ---------------------------------------------------------------------------

_model = None

def load_model(model_size, device, compute_type):
    global _model
    from faster_whisper import WhisperModel
    print(f"[STT] Loading Whisper {model_size} on {device} ({compute_type})...", flush=True)
    t0 = time.perf_counter()
    _model = WhisperModel(model_size, device=device, compute_type=compute_type)
    elapsed = time.perf_counter() - t0
    print(f"[STT] Model loaded in {elapsed:.2f}s", flush=True)
    return _model

# ---------------------------------------------------------------------------
# Multipart parser  (Python 3.13 — cgi module removed)
# ---------------------------------------------------------------------------

def parse_multipart(content_type_header: str, body: bytes):
    """
    Extract the first file/field payload from a multipart/form-data body.
    Returns (filename_hint, raw_bytes) or raises ValueError on failure.
    Uses stdlib email.parser — no external dependencies.
    """
    mime_header = (
        b"MIME-Version: 1.0\r\n"
        b"Content-Type: " + content_type_header.encode() + b"\r\n\r\n"
    ) + body

    msg = message_from_bytes(mime_header)

    if not msg.is_multipart():
        raise ValueError("Request body is not multipart/form-data")

    for part in msg.walk():
        cd = part.get("Content-Disposition", "")
        if not cd:
            continue
        payload = part.get_payload(decode=True)
        if payload is None or len(payload) == 0:
            continue
        # Accept any field named "audio" or any part with a filename
        name_param    = part.get_param("name",     header="content-disposition")
        filename_hint = part.get_param("filename", header="content-disposition")
        if name_param == "audio" or filename_hint:
            return filename_hint or "audio.bin", payload

    raise ValueError("No audio field found in multipart body")

# ---------------------------------------------------------------------------
# Transcription
# ---------------------------------------------------------------------------

def transcribe(audio_bytes: bytes, filename_hint: str):
    """
    Write audio_bytes to a temp file, transcribe, delete temp file.
    Returns dict with transcript, language, language_probability, duration_s,
    word_count, segment_count.
    """
    suffix = os.path.splitext(filename_hint)[1] if filename_hint else ".bin"
    if not suffix:
        suffix = ".bin"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix, delete=False, prefix="stt_"
        ) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        print(f"[STT] Audio bytes: {len(audio_bytes)} ({suffix})", flush=True)
        print(f"[STT] Transcription started", flush=True)
        t0 = time.perf_counter()

        segments, info = _model.transcribe(
            tmp_path,
            beam_size=5,
            language="en",
            task="transcribe",
            condition_on_previous_text=False,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=400,
            ),
        )

        all_segments = list(segments)
        text = "".join(seg.text for seg in all_segments).strip()
        elapsed = time.perf_counter() - t0
        word_count = len(text.split()) if text else 0

        print(f"[STT] Transcription completed in {elapsed:.2f}s", flush=True)
        print(f"[STT] words={word_count} segments={len(all_segments)}", flush=True)
        print(f'[STT] Transcript="{text}"', flush=True)

        return {
            "transcript":            text,
            "language":              info.language,
            "language_probability":  round(float(info.language_probability), 4),
            "duration_s":            round(elapsed, 3),
            "word_count":            word_count,
            "segment_count":         len(all_segments),
        }

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass

# ---------------------------------------------------------------------------
# HTTP request handler
# ---------------------------------------------------------------------------

def _json_response(handler, status: int, payload: dict):
    body = json.dumps(payload).encode()
    handler.send_response(status)
    handler.send_header("Content-Type",   "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class STTHandler(BaseHTTPRequestHandler):

    # Suppress per-request access log (use our own prints instead)
    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        if self.path == "/health":
            _json_response(self, 200, {
                "status": "ok",
                "model":  "whisper-small",
                "ready":  _model is not None,
            })
        else:
            _json_response(self, 404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/transcribe":
            _json_response(self, 404, {"error": "not found"})
            return

        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            _json_response(self, 400, {
                "error": "Expected multipart/form-data",
                "got":   content_type,
            })
            return

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            _json_response(self, 400, {"error": "Empty request body"})
            return

        body = self.rfile.read(content_length)
        print(f"[STT] Request received — {len(body)} bytes", flush=True)

        try:
            filename_hint, audio_bytes = parse_multipart(content_type, body)
        except ValueError as e:
            _json_response(self, 400, {"error": str(e)})
            return

        if len(audio_bytes) == 0:
            _json_response(self, 400, {"error": "Received empty audio payload"})
            return

        try:
            result = transcribe(audio_bytes, filename_hint)
            _json_response(self, 200, result)
        except Exception as e:
            print(f"[STT] Transcription error: {e}", flush=True)
            _json_response(self, 500, {"error": str(e)})

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    args = parse_args()
    load_model(args.model, args.device, args.compute_type)

    server = HTTPServer(("0.0.0.0", args.port), STTHandler)
    print(f"[STT] Service ready on http://localhost:{args.port}", flush=True)
    print(f"[STT] POST /transcribe   — transcribe audio (multipart/form-data, field: audio)", flush=True)
    print(f"[STT] GET  /health       — liveness check", flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[STT] Shutting down.", flush=True)
        server.shutdown()

if __name__ == "__main__":
    main()
