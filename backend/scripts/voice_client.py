#!/usr/bin/env python3
"""
Minimal test client for the real-time voice interviewer (Module 3, feature 9).

Runs the full loop end to end with no microphone and no browser, so it works
over SSH and in CI:

    question text  -> printed (the server sends text; nothing is spoken)
    answer audio   -> sent as base64 -> stored on the server as a file

No speech conversion happens anywhere. By default the "recording" is a short
generated WAV tone, which is enough to exercise the upload, size cap and
storage path. Pass --answer-file to send a real recording of yourself instead.

The point is that the server never receives text for the answer — only audio —
which is what makes this an anti-cheating voice interview rather than a form.

Usage
-----
    # 1. start the API
    uvicorn app.main:app --reload

    # 2. generate an interview and run the voice loop against it
    python scripts/voice_client.py --email candidate.demo@smarthire.dev \\
                                   --password 'Candidate@123'

    # against an existing interview
    python scripts/voice_client.py --interview-id 7

    # send a real recording rather than the generated tone
    python scripts/voice_client.py --answer-file ./me.wav

Options: --host, --interview-id, --type, --domain, --difficulty, --count,
--answer-file, --seconds.
"""

import argparse
import asyncio
import base64
import json
import math
import struct
import sys
import wave
from io import BytesIO
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

try:
    import httpx
    import websockets
except ImportError:  # pragma: no cover
    sys.exit("Missing deps. Run:  pip install -r requirements.txt")

SAMPLE_RATE = 16_000


def _api_base(host: str) -> str:
    return f"http://{host}/api"


def _ws_url(host: str, interview_id: int, token: str) -> str:
    query = urlencode({"token": token})
    return f"ws://{host}/api/interviews/voice/{interview_id}?{query}"


def login(host: str, email: str, password: str) -> str:
    response = httpx.post(
        f"{_api_base(host)}/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def create_interview(host: str, token: str, itype: str, domain: str, difficulty: str, count: int) -> int:
    response = httpx.post(
        f"{_api_base(host)}/interviews/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "interview_type": itype,
            "domain": domain,
            "difficulty": difficulty,
            "question_count": count,
        },
        timeout=120,
    )
    response.raise_for_status()
    body = response.json()
    print(f"  created interview {body['id']}  ({body['question_count']} questions, source={body['source']})")
    return body["id"]


def load_answer_audio(path: str) -> tuple[str, str, Optional[float]]:
    """
    Send a real recording. Returns (base64, mime type, duration or None).

    The duration matters: the server checks the transcript against it and
    discards transcripts implying an impossible speaking rate. Without one, a
    transcript cannot be verified and is not shown. WAV carries its length in
    the header; other containers need --duration passed explicitly, because
    guessing from the file size across codecs would be a fabricated number in
    the middle of the exact check that exists to catch fabrication.
    """
    suffix = Path(path).suffix.lower()
    mime = {".wav": "audio/wav", ".webm": "audio/webm", ".ogg": "audio/ogg",
            ".m4a": "audio/mp4", ".mp3": "audio/mpeg"}.get(suffix, "application/octet-stream")

    duration = None
    if suffix == ".wav":
        try:
            with wave.open(path, "rb") as source:
                duration = source.getnframes() / float(source.getframerate())
        except (wave.Error, OSError):
            duration = None

    return base64.b64encode(Path(path).read_bytes()).decode("ascii"), mime, duration


def generate_answer_audio(seconds: float) -> tuple[str, str]:
    """
    A plain 440 Hz WAV tone, built locally with the standard library.

    This is real audio of a realistic size, but it contains no speech — so
    Module 5 will transcribe it to nothing and report an empty answer. That is
    the correct outcome, not a failure. Pass --answer-file with a recording of
    an actual spoken answer to exercise the analysis properly.
    """
    frames = int(SAMPLE_RATE * seconds)
    samples = b"".join(
        struct.pack("<h", int(12000 * math.sin(2 * math.pi * 440 * i / SAMPLE_RATE)))
        for i in range(frames)
    )

    buffer = BytesIO()
    with wave.open(buffer, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(samples)

    return base64.b64encode(buffer.getvalue()).decode("ascii"), "audio/wav"


def _print_analysis(message: dict) -> None:
    """Render the Module 5 frame. Unavailable sections say why, never nothing."""
    if not message.get("available"):
        print(f"       analysis unavailable: {message.get('reason')}")
        return

    transcript = message.get("transcript") or ""
    print(f'       transcript: "{transcript}"' if transcript else "       transcript: (silence)")

    fillers = message.get("fillers") or {}
    rate = fillers.get("per_100_words")
    print(
        f"       fillers: {fillers.get('total', 0)}"
        + (f" ({rate}/100 words)" if rate is not None else " (too short for a rate)")
        + (f"  {fillers.get('by_word')}" if fillers.get("by_word") else "")
    )

    pace = message.get("pace") or {}
    if pace.get("available"):
        print(f"       pace: {pace['words_per_minute']} wpm — {pace['verdict']}")
    else:
        print(f"       pace: unavailable — {pace.get('reason')}")

    comms = message.get("communication") or {}
    if comms.get("available"):
        print(f"       grammar issues: {len(comms.get('grammar_issues') or [])}")
        print(f"       clarity: {comms.get('clarity')}")
    else:
        print(f"       communication: unavailable — {comms.get('reason')}")

    speech = message.get("pronunciation") or {}
    if speech.get("available"):
        print(f"       pronunciation: {speech.get('intelligibility')}")
    else:
        print(f"       pronunciation: unavailable — {speech.get('reason')}")


async def run(args: argparse.Namespace) -> int:
    print(f"→ logging in as {args.email}")
    token = login(args.host, args.email, args.password)

    interview_id = args.interview_id
    if interview_id is None:
        print("→ generating a new interview")
        interview_id = create_interview(
            args.host, token, args.type, args.domain, args.difficulty, args.count
        )

    print(f"→ opening websocket for interview {interview_id}\n")

    # The same recording is sent every turn, so build it once.
    try:
        if args.answer_file:
            answer_b64, answer_mime, answer_seconds = load_answer_audio(args.answer_file)
        else:
            answer_b64, answer_mime = generate_answer_audio(args.seconds)
            answer_seconds = args.seconds
    except OSError as exc:
        print(f"\n✗ Could not read the answer audio: {exc}")
        return 1

    # An explicit --duration always wins: it is the only way to give a real
    # length for a container this script cannot read one from.
    if args.duration:
        answer_seconds = args.duration

    print(f"  answer audio ready: {len(base64.b64decode(answer_b64)):,} bytes ({answer_mime})")
    if answer_seconds:
        print(f"  duration: {answer_seconds:.1f}s\n")
    else:
        print(
            "  duration: unknown — pass --duration, or the server will refuse to\n"
            "  show a transcript it cannot verify against the recording's length.\n"
        )

    async with websockets.connect(
        _ws_url(args.host, interview_id, token), max_size=16 * 1024 * 1024
    ) as ws:
        ready = json.loads(await ws.recv())
        if ready.get("type") == "error":
            print(f"✗ {ready['detail']}")
            return 1

        print(
            f"  READY  {ready['interview_type']} / {ready['difficulty']} / {ready['domain']}"
            f"  ({ready['answered']}/{ready['total']} answered)\n"
        )

        while True:
            await ws.send(json.dumps({"type": "next"}))
            message = json.loads(await ws.recv())
            kind = message.get("type")

            if kind == "complete":
                print(f"\n✓ interview complete — {message['answered']}/{message['total']} answered")
                break

            if kind == "error":
                print(f"✗ {message['detail']}")
                return 1

            if kind != "question":
                print(f"? unexpected message: {message}")
                return 1

            seq = message["sequence_no"]
            print(f"  Q{seq} [{message['category']}] {message['text']}")

            await ws.send(
                json.dumps(
                    {
                        "type": "answer",
                        "audio_b64": answer_b64,
                        "mime_type": answer_mime,
                        # A browser measures this from the recorder. Here it is
                        # whatever the file actually is, so pace is computed
                        # against a real duration rather than a guess.
                        "duration_seconds": answer_seconds,
                    }
                )
            )
            reply = json.loads(await ws.recv())

            if reply.get("type") != "recorded":
                print(f"       ✗ {reply.get('detail')}\n")
                return 1

            print(f"       recorded: {reply['bytes']:,} bytes of {reply['mime_type']}")
            print(f"       progress: {reply['answered']}/{reply['total']}")

            # Module 5 sends a second frame once transcription finishes. It has
            # to be consumed here, or it would be read as the reply to the next
            # "next" and look like a protocol error.
            if reply.get("analysis_pending"):
                print("       analysing…")
                analysis = json.loads(await ws.recv())
                _print_analysis(analysis)

            print()

    print(f"\nInspect the stored answers:  GET /api/interviews/{interview_id}")
    print(f"Play one back:               GET /api/interviews/{interview_id}/answers/1/audio")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--host", default="localhost:8000")
    parser.add_argument("--email", default="candidate.demo@smarthire.dev")
    parser.add_argument("--password", default="Candidate@123")
    parser.add_argument("--interview-id", type=int, default=None,
                        help="Use an existing interview instead of generating one.")
    parser.add_argument("--type", default="HR",
                        choices=["HR", "TECHNICAL", "BEHAVIORAL", "APTITUDE"])
    parser.add_argument("--domain", default="hr executive")
    parser.add_argument("--difficulty", default="EASY", choices=["EASY", "MEDIUM", "HARD"])
    parser.add_argument("--count", type=int, default=3)
    parser.add_argument("--answer-file", default=None,
                        help="Send this recording as the spoken answer instead of the "
                             "generated tone.")
    parser.add_argument("--seconds", type=float, default=3.0,
                        help="Length of the generated answer tone.")
    parser.add_argument("--duration", type=float, default=None,
                        help="Real speaking length of --answer-file, in seconds. "
                             "Read automatically from WAV; required for webm/mp3/m4a, "
                             "which this script cannot measure. The server checks the "
                             "transcript against it and discards one implying an "
                             "impossible speaking rate.")
    args = parser.parse_args()

    try:
        return asyncio.run(run(args))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
