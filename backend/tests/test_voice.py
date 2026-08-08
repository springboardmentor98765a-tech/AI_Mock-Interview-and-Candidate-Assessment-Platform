"""Module 3 feature 9 — the voice interviewer WebSocket."""

import asyncio
import base64
import json
import math
import struct
import wave
from io import BytesIO

import pytest
import websockets

from .conftest import BASE, auth

WS_BASE = BASE.replace("http://", "ws://").replace("https://", "wss://")


def _wav_bytes(seconds: float = 0.5, rate: int = 16_000) -> bytes:
    """A real, small WAV. Nothing transcribes it — it only has to be audio."""
    frames = b"".join(
        struct.pack("<h", int(9000 * math.sin(2 * math.pi * 440 * i / rate)))
        for i in range(int(rate * seconds))
    )
    buffer = BytesIO()
    with wave.open(buffer, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        out.writeframes(frames)
    return buffer.getvalue()


async def _first_message(url):
    """Connect, read the first frame, note the close code."""
    try:
        async with websockets.connect(url, max_size=16 * 1024 * 1024) as ws:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=20))
            code = None
            try:
                await asyncio.wait_for(ws.recv(), timeout=5)
            except websockets.ConnectionClosed as exc:
                code = exc.code
            except asyncio.TimeoutError:
                pass
            return msg, code
    except Exception as exc:
        return {"type": "connect_failed", "detail": str(exc)}, None


class TestVoiceAuth:
    def test_no_token_rejected(self):
        msg, code = asyncio.run(_first_message(f"{WS_BASE}/interviews/voice/1"))
        assert msg["type"] == "error"
        assert code == 4401

    def test_bad_token_rejected(self):
        msg, code = asyncio.run(_first_message(f"{WS_BASE}/interviews/voice/1?token=garbage"))
        assert msg["type"] == "error"
        assert code == 4401

    def test_missing_interview_rejected(self, candidate_token):
        msg, code = asyncio.run(
            _first_message(f"{WS_BASE}/interviews/voice/99999999?token={candidate_token}"))
        assert msg["type"] == "error"
        assert code == 4404

    def test_other_users_interview_rejected(self, client, candidate_token, recruiter_token):
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 2})
        iid = r.json()["id"]
        try:
            msg, code = asyncio.run(
                _first_message(f"{WS_BASE}/interviews/voice/{iid}?token={recruiter_token}"))
            assert msg["type"] == "error", "leaked another user's interview over the socket"
            assert code == 4404
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))


class TestVoiceDemoPage:
    def test_demo_page_served(self, client):
        r = client.get("/interviews/voice/demo")
        assert r.status_code == 200
        assert "getUserMedia" in r.text


class TestVoiceFlow:
    def test_ready_frame_and_question(self, client, candidate_token):
        """Connect to a real interview and pull the first question."""
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 2})
        iid = r.json()["id"]

        async def run():
            url = f"{WS_BASE}/interviews/voice/{iid}?token={candidate_token}"
            async with websockets.connect(url, max_size=16 * 1024 * 1024) as ws:
                ready = json.loads(await asyncio.wait_for(ws.recv(), timeout=20))
                await ws.send(json.dumps({"type": "next"}))
                question = json.loads(await asyncio.wait_for(ws.recv(), timeout=90))
                return ready, question

        try:
            ready, question = asyncio.run(run())
            assert ready["type"] == "ready"
            assert ready["total"] == 2
            assert question["type"] == "question"
            assert question["sequence_no"] == 1
            assert question["text"].strip()
            # Questions are text only now — nothing is spoken by the server.
            assert "audio_b64" not in question
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))

    def test_unknown_action_returns_error(self, client, candidate_token):
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 1})
        iid = r.json()["id"]

        async def run():
            url = f"{WS_BASE}/interviews/voice/{iid}?token={candidate_token}"
            async with websockets.connect(url) as ws:
                await asyncio.wait_for(ws.recv(), timeout=20)
                await ws.send(json.dumps({"type": "nonsense"}))
                return json.loads(await asyncio.wait_for(ws.recv(), timeout=20))

        try:
            msg = asyncio.run(run())
            assert msg["type"] == "error"
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))

    def test_recording_is_stored_and_playable(self, client, candidate_token):
        """The spoken answer is kept as audio and can be fetched back."""
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 1})
        iid = r.json()["id"]
        audio_b64 = base64.b64encode(_wav_bytes()).decode("ascii")

        async def run():
            url = f"{WS_BASE}/interviews/voice/{iid}?token={candidate_token}"
            async with websockets.connect(url, max_size=16 * 1024 * 1024) as ws:
                await asyncio.wait_for(ws.recv(), timeout=20)
                await ws.send(json.dumps({"type": "next"}))
                await asyncio.wait_for(ws.recv(), timeout=90)
                await ws.send(json.dumps(
                    {"type": "answer", "audio_b64": audio_b64, "mime_type": "audio/wav"}))
                return json.loads(await asyncio.wait_for(ws.recv(), timeout=30))

        try:
            reply = asyncio.run(run())
            assert reply["type"] == "recorded", reply
            assert reply["bytes"] == len(base64.b64decode(audio_b64))
            assert reply["answered"] == 1

            # the answer is audio, not a transcript
            detail = client.get(f"/interviews/{iid}", headers=auth(candidate_token)).json()
            question = detail["questions"][0]
            assert question["has_answer_audio"] is True
            assert question["answer_text"] is None

            played = client.get(
                f"/interviews/{iid}/answers/1/audio", headers=auth(candidate_token))
            assert played.status_code == 200
            assert played.content == base64.b64decode(audio_b64)
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))

    def test_skip_advances_and_marks_not_attempted(self, client, candidate_token):
        """Skip moves to the next question and never counts as answered."""
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 2})
        iid = r.json()["id"]

        async def run():
            url = f"{WS_BASE}/interviews/voice/{iid}?token={candidate_token}"
            async with websockets.connect(url, max_size=16 * 1024 * 1024) as ws:
                await asyncio.wait_for(ws.recv(), timeout=20)
                await ws.send(json.dumps({"type": "next"}))
                first = json.loads(await asyncio.wait_for(ws.recv(), timeout=90))
                await ws.send(json.dumps({"type": "skip"}))
                skipped = json.loads(await asyncio.wait_for(ws.recv(), timeout=30))
                # the next question arrives unprompted — no second "next"
                following = json.loads(await asyncio.wait_for(ws.recv(), timeout=30))
                return first, skipped, following

        try:
            first, skipped, following = asyncio.run(run())
            assert first["sequence_no"] == 1

            assert skipped["type"] == "skipped"
            assert skipped["attempted"] is False
            assert skipped["skipped"] == 1
            assert skipped["answered"] == 0, "a skip must not count as an answer"

            assert following["type"] == "question"
            assert following["sequence_no"] == 2, "skip did not advance the interview"

            detail = client.get(f"/interviews/{iid}", headers=auth(candidate_token)).json()
            first_row = detail["questions"][0]
            assert first_row["attempted"] is False
            assert first_row["skipped_at"] is not None
            assert first_row["has_answer_audio"] is False
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))

    def test_skipped_question_is_not_asked_again(self, client, candidate_token):
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 2})
        iid = r.json()["id"]

        async def run():
            url = f"{WS_BASE}/interviews/voice/{iid}?token={candidate_token}"
            async with websockets.connect(url, max_size=16 * 1024 * 1024) as ws:
                await asyncio.wait_for(ws.recv(), timeout=20)
                await ws.send(json.dumps({"type": "next"}))
                await asyncio.wait_for(ws.recv(), timeout=90)
                await ws.send(json.dumps({"type": "skip"}))
                await asyncio.wait_for(ws.recv(), timeout=30)   # skipped
                await asyncio.wait_for(ws.recv(), timeout=30)   # question 2
                await ws.send(json.dumps({"type": "skip"}))
                await asyncio.wait_for(ws.recv(), timeout=30)   # skipped
                return json.loads(await asyncio.wait_for(ws.recv(), timeout=30))

        try:
            final = asyncio.run(run())
            assert final["type"] == "complete", "skipped questions were served again"
            assert final["answered"] == 0
            assert final["skipped"] == 2
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))

    def test_oversized_answer_rejected(self, client, candidate_token):
        """The size cap is enforced on the encoded string, before decoding."""
        from app.core.config import settings

        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 1})
        iid = r.json()["id"]
        oversized = "A" * ((settings.MAX_ANSWER_AUDIO_MB * 1024 * 1024 * 4) // 3 + 4)

        async def run():
            url = f"{WS_BASE}/interviews/voice/{iid}?token={candidate_token}"
            async with websockets.connect(url, max_size=32 * 1024 * 1024) as ws:
                await asyncio.wait_for(ws.recv(), timeout=20)
                await ws.send(json.dumps({"type": "next"}))
                await asyncio.wait_for(ws.recv(), timeout=90)
                await ws.send(json.dumps(
                    {"type": "answer", "audio_b64": oversized, "mime_type": "audio/wav"}))
                return json.loads(await asyncio.wait_for(ws.recv(), timeout=30))

        try:
            reply = asyncio.run(run())
            assert reply["type"] == "error"
            assert "MB" in reply["detail"]
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))

    def test_missing_recording_is_404(self, client, candidate_token):
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 1})
        iid = r.json()["id"]
        try:
            played = client.get(
                f"/interviews/{iid}/answers/1/audio", headers=auth(candidate_token))
            assert played.status_code == 404
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))

    def test_answer_before_question_is_error(self, client, candidate_token):
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 1})
        iid = r.json()["id"]

        async def run():
            url = f"{WS_BASE}/interviews/voice/{iid}?token={candidate_token}"
            async with websockets.connect(url) as ws:
                await asyncio.wait_for(ws.recv(), timeout=20)
                await ws.send(json.dumps({"type": "answer", "audio_b64": "AAAA"}))
                return json.loads(await asyncio.wait_for(ws.recv(), timeout=20))

        try:
            msg = asyncio.run(run())
            assert msg["type"] == "error"
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))
