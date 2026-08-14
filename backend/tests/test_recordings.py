"""
Session video recordings and the playback access log.

These run over real HTTP against a running server, like the rest of the
endpoint tests. The "video" here is a genuine EBML header followed by padding:
nothing decodes it, and nothing needs to — the endpoint's job is to check what
the bytes claim to be, cap the size, and store it under a name the server chose.
"""

import pytest

from .conftest import auth

# The EBML header every WebM/Matroska file begins with. The magic-byte check
# reads exactly this, so a real container header is what makes a valid fixture.
EBML = b"\x1a\x45\xdf\xa3"


def webm(padding: int = 4096) -> bytes:
    return EBML + b"\x00" * padding


@pytest.fixture
def interview(client, candidate_token):
    r = client.post("/interviews/generate", headers=auth(candidate_token), json={
        "interview_type": "HR", "domain": "hr executive",
        "difficulty": "EASY", "question_count": 2,
    })
    assert r.status_code == 201, r.text
    body = r.json()
    yield body
    client.delete(f"/interviews/{body['id']}", headers=auth(candidate_token))


def upload(client, token, interview_id, data=None, content_type="video/webm", duration=None):
    files = {"file": ("session.webm", data if data is not None else webm(), content_type)}
    payload = {"duration_seconds": str(duration)} if duration else None
    return client.post(
        f"/interviews/{interview_id}/recording",
        headers=auth(token),
        files=files,
        data=payload,
    )


class TestUploadValidation:
    def test_uploads_and_returns_metadata(self, client, candidate_token, interview):
        r = upload(client, candidate_token, interview["id"], duration=12.5)
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["interview_id"] == interview["id"]
        assert body["size_bytes"] > 0
        assert body["mime_type"] == "video/webm"
        assert body["duration_seconds"] == 12.5

    def test_rejects_a_non_video_by_magic_bytes(self, client, candidate_token, interview):
        """Content-Type is client-supplied. The bytes decide."""
        r = upload(client, candidate_token, interview["id"], data=b"not a video at all" * 100)
        assert r.status_code == 400
        assert "not a video" in r.json()["detail"].lower()

    def test_rejects_an_unsupported_content_type(self, client, candidate_token, interview):
        r = upload(client, candidate_token, interview["id"], content_type="application/pdf")
        assert r.status_code == 400
        assert "unsupported" in r.json()["detail"].lower()

    def test_rejects_an_empty_upload(self, client, candidate_token, interview):
        r = upload(client, candidate_token, interview["id"], data=b"")
        assert r.status_code == 400

    def test_accepts_mp4_by_its_ftyp_box(self, client, candidate_token, interview):
        """MP4 has no EBML header — it is identified by the ftyp box at offset 4."""
        mp4 = b"\x00\x00\x00\x20ftypisom" + b"\x00" * 2048
        r = upload(client, candidate_token, interview["id"], data=mp4, content_type="video/mp4")
        assert r.status_code == 201, r.text

    def test_requires_auth(self, client, interview):
        r = client.post(
            f"/interviews/{interview['id']}/recording",
            files={"file": ("s.webm", webm(), "video/webm")},
        )
        assert r.status_code == 401

    def test_cannot_upload_to_another_users_interview(self, client, recruiter_token, interview):
        r = upload(client, recruiter_token, interview["id"])
        assert r.status_code == 404, "404 not 403 — a 403 would confirm the id exists"


class TestPlayback:
    def test_returns_the_exact_bytes_uploaded(self, client, candidate_token, interview):
        payload = webm(9000)
        upload(client, candidate_token, interview["id"], data=payload)

        r = client.get(f"/interviews/{interview['id']}/recording", headers=auth(candidate_token))
        assert r.status_code == 200, r.text
        assert r.content == payload, "what came back is not what went in"
        assert r.headers["content-type"].startswith("video/webm")

    def test_404_when_no_recording(self, client, candidate_token, interview):
        r = client.get(f"/interviews/{interview['id']}/recording", headers=auth(candidate_token))
        assert r.status_code == 404

    @pytest.mark.parametrize("who", ["recruiter", "admin"])
    def test_only_the_candidate_can_play_it_back(self, client, candidate_token, recruiter_token,
                                                 admin_token, interview, who):
        """
        Narrower than the module spec's "authorized users", and deliberately so:
        widening it is a policy decision about who may replay a candidate's face
        and voice. If that policy changes, this test is the thing to change.
        """
        upload(client, candidate_token, interview["id"])
        token = recruiter_token if who == "recruiter" else admin_token
        r = client.get(f"/interviews/{interview['id']}/recording", headers=auth(token))
        assert r.status_code == 404

    def test_requires_auth(self, client, interview):
        assert client.get(f"/interviews/{interview['id']}/recording").status_code == 401


class TestReplacement:
    def test_re_uploading_replaces_rather_than_accumulates(self, client, candidate_token,
                                                           interview):
        """A candidate who re-records should not leave copies of their face on disk."""
        first = webm(2048)
        second = webm(6000)
        upload(client, candidate_token, interview["id"], data=first)
        upload(client, candidate_token, interview["id"], data=second)

        r = client.get(f"/interviews/{interview['id']}/recording", headers=auth(candidate_token))
        assert r.content == second, "playback returned the superseded recording"


class TestAccessLog:
    """Recordings are a person's face and voice. Who played them back is a fact."""

    def _rows(self, interview_id, artefact=None):
        from app.db.session import SessionLocal
        from app.models.recording import RecordingAccess

        db = SessionLocal()
        try:
            query = db.query(RecordingAccess).filter(
                RecordingAccess.interview_id == interview_id
            )
            if artefact:
                query = query.filter(RecordingAccess.artefact == artefact)
            return query.all()
        finally:
            db.close()

    def test_playback_is_logged(self, client, candidate_token, interview):
        upload(client, candidate_token, interview["id"])
        before = len(self._rows(interview["id"], "video"))

        client.get(f"/interviews/{interview['id']}/recording", headers=auth(candidate_token))

        rows = self._rows(interview["id"], "video")
        assert len(rows) == before + 1
        assert rows[-1].user_id is not None
        assert rows[-1].accessed_at is not None

    def test_uploading_is_not_an_access(self, client, candidate_token, interview):
        """Storing your own recording is not a playback of it."""
        upload(client, candidate_token, interview["id"])
        assert self._rows(interview["id"], "video") == []

    def test_a_refused_request_is_not_logged(self, client, candidate_token, recruiter_token,
                                             interview):
        """A 404 must never appear in the log as though someone had listened."""
        upload(client, candidate_token, interview["id"])
        client.get(f"/interviews/{interview['id']}/recording", headers=auth(recruiter_token))
        assert self._rows(interview["id"], "video") == []

    def test_missing_recording_is_not_logged(self, client, candidate_token, interview):
        client.get(f"/interviews/{interview['id']}/recording", headers=auth(candidate_token))
        assert self._rows(interview["id"], "video") == []


class TestDeletion:
    def test_deleting_the_interview_removes_the_recording(self, client, candidate_token):
        made = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 1,
        }).json()
        iid = made["id"]

        upload(client, candidate_token, iid)
        client.get(f"/interviews/{iid}/recording", headers=auth(candidate_token))

        assert client.delete(f"/interviews/{iid}", headers=auth(candidate_token)).status_code == 204

        from app.db.session import SessionLocal
        from app.models.recording import InterviewRecording, RecordingAccess

        db = SessionLocal()
        try:
            assert db.query(InterviewRecording).filter(
                InterviewRecording.interview_id == iid
            ).count() == 0, "the recording row outlived its interview"

            # The audit trail is deliberately NOT cascaded away: deleting an
            # interview must not erase the record of who had already seen it.
            assert db.query(RecordingAccess).filter(
                RecordingAccess.interview_id == iid
            ).count() >= 1, "deleting an interview erased the access log"
        finally:
            db.close()
