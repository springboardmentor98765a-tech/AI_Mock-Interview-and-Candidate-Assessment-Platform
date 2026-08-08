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


def load_answer_audio(path: str) -> tuple[str, str]:
    """Send a real recording. Returns (base64, mime type guessed from suffix)."""
    suffix = Path(path).suffix.lower()
    mime = {".wav": "audio/wav", ".webm": "audio/webm", ".ogg": "audio/ogg",
            ".m4a": "audio/mp4", ".mp3": "audio/mpeg"}.get(suffix, "application/octet-stream")
    return base64.b64encode(Path(path).read_bytes()).decode("ascii"), mime


def generate_answer_audio(seconds: float) -> tuple[str, str]:
    """
    A plain 440 Hz WAV tone, built locally with the standard library.

    Nothing transcribes this, so it does not need to contain speech — it only
    needs to be real audio bytes of a realistic size.
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
        answer_b64, answer_mime = (
            load_answer_audio(args.answer_file) if args.answer_file
            else generate_answer_audio(args.seconds)
        )
    except OSError as exc:
        print(f"\n✗ Could not read the answer audio: {exc}")
        return 1
    print(f"  answer audio ready: {len(base64.b64decode(answer_b64)):,} bytes ({answer_mime})\n")

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
                    {"type": "answer", "audio_b64": answer_b64, "mime_type": answer_mime}
                )
            )
            reply = json.loads(await ws.recv())

            if reply.get("type") == "recorded":
                print(f"       recorded: {reply['bytes']:,} bytes of {reply['mime_type']}")
                print(f"       progress: {reply['answered']}/{reply['total']}\n")
            else:
                print(f"       ✗ {reply.get('detail')}\n")
                return 1

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
    args = parser.parse_args()

    try:
        return asyncio.run(run(args))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
