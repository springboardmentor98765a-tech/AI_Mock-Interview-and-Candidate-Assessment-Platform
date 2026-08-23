"""
Module 6 exposed over HTTP: Interview.overall_score on the interview
endpoints, and the recruiter/admin leaderboard ranked on it.

Interviews are generated for real over HTTP, then driven to COMPLETED with a
score by writing directly to the database — the same shortcut test_recordings
and test_speech_analysis take for state a WebSocket flow would otherwise have
to earn through a real (and here, unnecessary) transcription and AI grading
call. What is under test is the read side: does the stored score come back
through the schemas, and does the leaderboard rank on it correctly — not
whether the AI call that produces the score works, which test_ollama_provider
and test_scoring already cover.
"""

import pytest

from .conftest import auth


@pytest.fixture(scope="module")
def db():
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    import app.main  # noqa: F401 — registers every model, so FK lookups below resolve
    from app.db.session import SessionLocal

    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def scored_interview(client, candidate_token, db):
    """A COMPLETED interview with a known overall_score, written directly."""
    from datetime import datetime, timezone

    from app.models.interview import Interview, SessionStatus

    r = client.post("/interviews/generate", headers=auth(candidate_token), json={
        "interview_type": "HR", "domain": "hr executive",
        "difficulty": "EASY", "question_count": 1,
    })
    assert r.status_code == 201, r.text
    interview_id = r.json()["id"]

    row = db.query(Interview).filter(Interview.id == interview_id).one()
    row.status = SessionStatus.COMPLETED
    row.started_at = datetime.now(timezone.utc)
    row.completed_at = datetime.now(timezone.utc)
    row.overall_score = 82.5
    db.commit()

    yield interview_id

    client.delete(f"/interviews/{interview_id}", headers=auth(candidate_token))


class TestScoreOnInterviewEndpoints:
    def test_overall_score_and_rating_on_detail(self, client, candidate_token, scored_interview):
        body = client.get(f"/interviews/{scored_interview}", headers=auth(candidate_token)).json()
        assert body["overall_score"] == 82.5
        assert body["score_rating"] == "Good"  # 75-89

    def test_overall_score_on_history_list(self, client, candidate_token, scored_interview):
        rows = client.get("/interviews", headers=auth(candidate_token)).json()
        row = next(r for r in rows if r["id"] == scored_interview)
        assert row["overall_score"] == 82.5
        assert row["score_rating"] == "Good"

    def test_unscored_interview_has_no_rating(self, client, candidate_token):
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 1,
        })
        iid = r.json()["id"]
        try:
            body = client.get(f"/interviews/{iid}", headers=auth(candidate_token)).json()
            assert body["overall_score"] is None
            assert body["score_rating"] is None
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))


class TestLeaderboard:
    def test_requires_recruiter_or_admin(self, client, candidate_token):
        assert client.get("/analytics/leaderboard", headers=auth(candidate_token)).status_code == 403

    def test_recruiter_and_admin_can_read_it(self, client, recruiter_token, admin_token):
        assert client.get("/analytics/leaderboard", headers=auth(recruiter_token)).status_code == 200
        assert client.get("/analytics/leaderboard", headers=auth(admin_token)).status_code == 200

    def test_scored_candidate_is_ranked(self, client, recruiter_token, scored_interview, candidate_token):
        board = client.get("/analytics/leaderboard", headers=auth(recruiter_token)).json()
        entry = next((e for e in board if e["interview_id"] == scored_interview), None)
        assert entry is not None, "a completed, scored interview must appear on the leaderboard"
        assert entry["score"] == 82.5
        assert entry["rating"] == "Good"
        assert entry["rank"] >= 1

    def test_ranked_by_score_descending(self, client, recruiter_token):
        board = client.get("/analytics/leaderboard", headers=auth(recruiter_token)).json()
        scores = [entry["score"] for entry in board]
        assert scores == sorted(scores, reverse=True)
        assert [entry["rank"] for entry in board] == list(range(1, len(board) + 1))

    def test_basis_is_most_recent_completed_not_best(
        self, client, candidate_token, recruiter_token, db, scored_interview
    ):
        """
        A second, lower-scoring, more recent completed interview must replace
        the first on the leaderboard — ranking is current standing, not a
        personal best.
        """
        from datetime import datetime, timedelta, timezone

        from app.models.interview import Interview, SessionStatus

        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 1,
        })
        newer_id = r.json()["id"]
        try:
            row = db.query(Interview).filter(Interview.id == newer_id).one()
            row.status = SessionStatus.COMPLETED
            row.started_at = datetime.now(timezone.utc)
            # Strictly after scored_interview's completed_at, so it is the
            # candidate's most recent completed interview.
            row.completed_at = datetime.now(timezone.utc) + timedelta(seconds=5)
            row.overall_score = 45.0
            db.commit()

            board = client.get("/analytics/leaderboard", headers=auth(recruiter_token)).json()
            candidate_entries = [e for e in board if e["user_id"] == row.user_id]

            assert len(candidate_entries) == 1, "one candidate must produce exactly one row"
            assert candidate_entries[0]["interview_id"] == newer_id
            assert candidate_entries[0]["score"] == 45.0
        finally:
            client.delete(f"/interviews/{newer_id}", headers=auth(candidate_token))
