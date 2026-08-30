"""
Real analytics — the numbers must match the database, not a guess.

These tests assert against live COUNT queries so a fabricated or drifting
figure fails immediately.
"""

import pytest
from sqlalchemy import func

from .conftest import auth


@pytest.fixture(scope="module")
def db():
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from app.db.session import SessionLocal

    session = SessionLocal()
    yield session
    session.close()


class TestAdminAnalytics:
    def test_requires_admin(self, client, candidate_token, recruiter_token):
        assert client.get("/analytics/admin", headers=auth(candidate_token)).status_code == 403
        assert client.get("/analytics/admin", headers=auth(recruiter_token)).status_code == 403

    def test_numbers_match_the_database(self, client, admin_token, db):
        from app.models.interview import Interview, InterviewQuestion
        from app.models.resume import Resume
        from app.models.user import User

        body = client.get("/analytics/admin", headers=auth(admin_token)).json()

        assert body["users_total"] == db.query(User).count()
        assert body["interviews_total"] == db.query(Interview).count()
        assert body["questions_total"] == db.query(InterviewQuestion).count()
        assert body["resumes_total"] == db.query(Resume).count()
        from app.models.interview import QUESTION_ANSWERED, QUESTION_SKIPPED

        assert body["questions_answered"] == db.query(InterviewQuestion).filter(
            QUESTION_ANSWERED
        ).count()
        # A skipped question was not attempted and must not inflate the
        # answered figure.
        assert body["questions_skipped"] == db.query(InterviewQuestion).filter(
            QUESTION_SKIPPED
        ).count()

    def test_role_breakdown_sums_to_total(self, client, admin_token):
        body = client.get("/analytics/admin", headers=auth(admin_token)).json()
        assert sum(body["users_by_role"].values()) == body["users_total"]

    def test_status_breakdown_sums_to_total(self, client, admin_token):
        body = client.get("/analytics/admin", headers=auth(admin_token)).json()
        assert sum(body["interviews_by_status"].values()) == body["interviews_total"]

    def test_time_series_has_14_points(self, client, admin_token):
        body = client.get("/analytics/admin", headers=auth(admin_token)).json()
        series = body["interviews_last_14_days"]
        assert len(series) == 14
        assert all(isinstance(p["count"], int) for p in series)

    def test_no_score_fields_present(self, client, admin_token):
        """The hard rule: no fabricated score data anywhere in the payload."""
        body = client.get("/analytics/admin", headers=auth(admin_token)).json()
        blob = str(body).lower()
        for banned in ("avg_score", "score_distribution", "confidence", "eye_contact"):
            assert banned not in blob, f"score-derived field {banned!r} leaked into analytics"


class TestCandidateAnalytics:
    def test_requires_candidate(self, client, recruiter_token, admin_token):
        assert client.get("/analytics/candidate", headers=auth(recruiter_token)).status_code == 403
        assert client.get("/analytics/candidate", headers=auth(admin_token)).status_code == 403

    def test_counts_are_own_only(self, client, candidate_token, db):
        from app.models.interview import Interview
        from app.models.user import User

        me = client.get("/users/me", headers=auth(candidate_token)).json()
        body = client.get("/analytics/candidate", headers=auth(candidate_token)).json()
        expected = db.query(Interview).filter(Interview.user_id == me["id"]).count()
        assert body["interviews_total"] == expected

    def test_scoring_fields_are_consistent(self, client, candidate_token):
        """
        Module 5 exists now, so the flag says so — and a score/rating are a
        pair: one is present exactly when the other is, never a number with
        no label or a label with no number.
        """
        body = client.get("/analytics/candidate", headers=auth(candidate_token)).json()
        assert body["scoring_available"] is True
        assert "latest_score" in body and "latest_score_rating" in body and "best_score" in body
        assert (body["latest_score"] is None) == (body["latest_score_rating"] is None)

    def test_reflects_a_new_interview(self, client, candidate_token):
        before = client.get("/analytics/candidate", headers=auth(candidate_token)).json()
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "analytics probe",
            "difficulty": "EASY", "question_count": 2})
        iid = r.json()["id"]
        try:
            after = client.get("/analytics/candidate", headers=auth(candidate_token)).json()
            assert after["interviews_total"] == before["interviews_total"] + 1
            assert after["questions_total"] == before["questions_total"] + 2
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))


class TestRecruiterAnalytics:
    def test_requires_recruiter_or_admin(self, client, candidate_token):
        assert client.get("/analytics/recruiter", headers=auth(candidate_token)).status_code == 403

    def test_candidate_count_matches_db(self, client, recruiter_token, db):
        from app.models.user import Role, User

        body = client.get("/analytics/recruiter", headers=auth(recruiter_token)).json()
        assert body["candidates_total"] == db.query(User).filter(
            User.role == Role.CANDIDATE
        ).count()

    def test_scoring_fields_are_consistent(self, client, recruiter_token):
        body = client.get("/analytics/recruiter", headers=auth(recruiter_token)).json()
        assert body["scoring_available"] is True
        assert isinstance(body["scored_interviews"], int) and body["scored_interviews"] >= 0
        # None with nothing scored yet, never a fabricated 0.
        assert body["average_score"] is None or isinstance(body["average_score"], float)

    def test_candidate_list_carries_a_real_score_not_a_rank(self, client, recruiter_token):
        """
        Module 5 exists, so each row carries the candidate's latest score —
        but this is a directory (see its own docstring), so it is still not
        ranked. Ranking lives at GET /analytics/leaderboard.
        """
        rows = client.get("/analytics/recruiter/candidates", headers=auth(recruiter_token)).json()
        assert isinstance(rows, list)
        for row in rows:
            assert "latest_score" in row and "latest_score_rating" in row
            assert "rank" not in row
            if row["latest_score"] is not None:
                assert 0 <= row["latest_score"] <= 100
                assert row["latest_score_rating"]
            assert "rank" not in row, "fabricated rank in the candidate list"
            assert row["interviews_total"] >= 0

    def test_candidate_list_blocked_for_candidates(self, client, candidate_token):
        r = client.get("/analytics/recruiter/candidates", headers=auth(candidate_token))
        assert r.status_code == 403


class TestLiveMonitoring:
    def test_requires_recruiter_or_admin(self, client, candidate_token):
        assert client.get("/analytics/live", headers=auth(candidate_token)).status_code == 403

    def test_started_interview_appears_and_leaves(self, client, candidate_token, recruiter_token):
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "live probe",
            "difficulty": "EASY", "question_count": 2})
        iid = r.json()["id"]
        try:
            live = client.get("/analytics/live", headers=auth(recruiter_token)).json()
            assert iid not in [x["interview_id"] for x in live], "unstarted interview shown as live"

            client.post("/interviews/start", headers=auth(candidate_token),
                        json={"interview_id": iid})
            live = client.get("/analytics/live", headers=auth(recruiter_token)).json()
            entry = next((x for x in live if x["interview_id"] == iid), None)
            assert entry is not None, "IN_PROGRESS interview missing from live monitoring"
            assert entry["questions_total"] == 2
            assert entry["questions_answered"] == 0
            assert entry["candidate_name"]

            client.put(f"/interviews/{iid}", headers=auth(candidate_token),
                       json={"status": "COMPLETED"})
            live = client.get("/analytics/live", headers=auth(recruiter_token)).json()
            assert iid not in [x["interview_id"] for x in live], "completed interview still live"
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))


class TestPausedIsStillLive:
    """
    A paused candidate is still in a live session. Dropping them from the
    monitor would make someone who stepped away for a minute silently vanish.
    """

    def test_paused_interview_stays_in_the_live_list(self, client, candidate_token,
                                                     recruiter_token):
        made = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 2}).json()
        iid = made["id"]
        try:
            client.post("/interviews/start", headers=auth(candidate_token),
                        json={"interview_id": iid})
            client.post(f"/interviews/{iid}/pause", headers=auth(candidate_token))

            live = client.get("/analytics/live", headers=auth(recruiter_token)).json()
            row = next((r for r in live if r["interview_id"] == iid), None)

            assert row is not None, "a paused candidate vanished from the live monitor"
            assert row["paused"] is True, "the monitor cannot tell paused from active"
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))

    def test_live_count_matches_the_live_list(self, client, candidate_token, recruiter_token):
        """The summary number and the list it summarises must not disagree."""
        made = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 2}).json()
        iid = made["id"]
        try:
            client.post("/interviews/start", headers=auth(candidate_token),
                        json={"interview_id": iid})
            client.post(f"/interviews/{iid}/pause", headers=auth(candidate_token))

            summary = client.get("/analytics/recruiter", headers=auth(recruiter_token)).json()
            live = client.get("/analytics/live", headers=auth(recruiter_token)).json()
            assert summary["live_now"] == len(live)
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))

    def test_completed_interview_leaves_the_live_list(self, client, candidate_token,
                                                      recruiter_token):
        made = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 2}).json()
        iid = made["id"]
        try:
            client.post("/interviews/start", headers=auth(candidate_token),
                        json={"interview_id": iid})
            client.post(f"/interviews/{iid}/end", headers=auth(candidate_token))

            live = client.get("/analytics/live", headers=auth(recruiter_token)).json()
            assert iid not in [r["interview_id"] for r in live]
        finally:
            client.delete(f"/interviews/{iid}", headers=auth(candidate_token))
