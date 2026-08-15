"""
backend/ai/tts_service.py

Persistent local Kokoro TTS HTTP service.
Loads KPipeline once at startup; never reloads per request.

Endpoints:
  GET  /health    - {"status":"ok","model":"kokoro-0.9.4","ready":true}
  POST /speak     - JSON body {"text":"..."} -> audio/wav binary

Usage:
  python -u tts_service.py [--port 8766] [--voice af_heart] [--device cuda]

Ports in use: 5000 (Express), 5173 (Vite), 11434 (Ollama), 8765 (Whisper STT)
This service uses: 8766
"""

import argparse
import io
import json
import sys
import time
import wave
from http.server import BaseHTTPRequestHandler, HTTPServer

# Heavy imports (numpy, soundfile, kokoro/torch) are deferred to main()
# to avoid module-level CUDA init failures in non-interactive environments.
# This matches the pattern used by stt_service.py.

np        = None
KPipeline = None

# ── globals set at startup ───────────────────────────────────────────────────
PIPELINE = None
VOICE    = 'af_heart'
READY    = False
MODEL_ID = 'kokoro-0.9.4'


# ── audio helpers ────────────────────────────────────────────────────────────

def float32_to_wav_bytes(audio_f32, sample_rate=24000):
    """Convert float32 numpy audio to 16-bit PCM WAV bytes (in-memory)."""
    audio_i16 = np.clip(audio_f32, -1.0, 1.0)
    audio_i16 = (audio_i16 * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_i16.tobytes())
    return buf.getvalue()


def generate_speech(text):
    """Run Kokoro inference and return WAV bytes."""
    chunks = []
    generator = PIPELINE(text, voice=VOICE)
    for _, _, audio in generator:
        if audio is not None and len(audio) > 0:
            chunks.append(audio)
    if not chunks:
        raise ValueError('Kokoro produced no audio output')
    combined = np.concatenate(chunks)
    return float32_to_wav_bytes(combined, sample_rate=24000)


# ── HTTP handler ─────────────────────────────────────────────────────────────

class TTSHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        sys.stdout.write(f'[TTS] {fmt % args}\n')
        sys.stdout.flush()

    def _send_json(self, code, obj):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_wav(self, wav_bytes):
        self.send_response(200)
        self.send_header('Content-Type', 'audio/wav')
        self.send_header('Content-Length', str(len(wav_bytes)))
        self.send_header('Cache-Control', 'no-cache, no-store')
        self.end_headers()
        self.wfile.write(wav_bytes)

    def do_GET(self):
        if self.path == '/health':
            self._send_json(200, {
                'status': 'ok',
                'model':  MODEL_ID,
                'voice':  VOICE,
                'ready':  READY,
            })
        else:
            self._send_json(404, {'error': 'not found'})

    def do_POST(self):
        if self.path != '/speak':
            self._send_json(404, {'error': 'not found'})
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length)
            body   = json.loads(raw)
            text   = str(body.get('text', '')).strip()
        except Exception as e:
            self._send_json(400, {'error': f'Bad request: {e}'})
            return

        if not text:
            self._send_json(400, {'error': 'text is required'})
            return

        if not READY:
            self._send_json(503, {'error': 'Model not ready'})
            return

        t0 = time.perf_counter()
        try:
            wav_bytes = generate_speech(text)
            elapsed   = time.perf_counter() - t0
            sys.stdout.write(
                f'[TTS] Synthesised {len(text)} chars -> {len(wav_bytes)} bytes WAV in {elapsed:.2f}s\n'
            )
            sys.stdout.flush()
            self._send_wav(wav_bytes)
        except Exception as e:
            elapsed = time.perf_counter() - t0
            sys.stderr.write(f'[TTS] Error after {elapsed:.2f}s: {e}\n')
            sys.stderr.flush()
            self._send_json(500, {'error': str(e)})


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    global np, KPipeline, PIPELINE, VOICE, READY

    parser = argparse.ArgumentParser(description='Kokoro TTS HTTP service')
    parser.add_argument('--port',   type=int, default=8766)
    parser.add_argument('--voice',  default='af_heart')
    parser.add_argument('--device', default='cuda')
    args = parser.parse_args()

    VOICE = args.voice

    # Force UTF-8 stdout/stderr BEFORE any imports so library warnings
    # (which may contain Unicode characters) do not crash cp1252 on Windows.
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    # Deferred heavy imports — done here so crashes are visible on stdout
    sys.stdout.write(f'[TTS] Importing numpy, soundfile, kokoro...\n')
    sys.stdout.flush()
    import numpy as _np
    import soundfile as sf  # noqa: F401 — confirms soundfile is available
    from kokoro import KPipeline as _KPipeline
    np        = _np
    KPipeline = _KPipeline

    sys.stdout.write(f'[TTS] Loading Kokoro on {args.device} | voice={VOICE}...\n')
    sys.stdout.flush()

    t0 = time.perf_counter()
    try:
        PIPELINE = KPipeline(lang_code='a', device=args.device)
    except Exception as e:
        sys.stderr.write(f'[TTS] CUDA load failed ({e}), retrying on cpu...\n')
        sys.stderr.flush()
        PIPELINE = KPipeline(lang_code='a', device='cpu')

    elapsed = time.perf_counter() - t0
    sys.stdout.write(f'[TTS] Model loaded in {elapsed:.2f}s\n')
    sys.stdout.write(f'[TTS] Service ready on http://localhost:{args.port}\n')
    sys.stdout.write(f'[TTS] POST /speak  - synthesise speech (JSON: {{"text":"..."}})\n')
    sys.stdout.write(f'[TTS] GET  /health - liveness check\n')
    sys.stdout.flush()

    READY = True

    server = HTTPServer(('localhost', args.port), TTSHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.stdout.write('\n[TTS] Shutting down.\n')


if __name__ == '__main__':
    main()
