"""
Module 6 over HTTP: submitting live tracking, and reading it back.

These hit a real running server. What is under test is the route — ownership,
validation, storage, and the report reaching the analysis endpoint — not the
aggregation arithmetic, which test_behavior_analysis covers exhaustively
in-process.
"""

import pytest

from .conftest import auth


def sample(gaze="camera", expression="neutral", face_present=True):
    return {"gaze": gaze, "expression": expression, "face_present": face_present}


def submission(count=100, **kwargs):
    return {
        "samples": [sample(**kwargs) for _ in range(count)],
        "tracked_seconds": count / 4,
        "alerts_shown": 0,
    }


@pytest.fixture
def interview(client, candidate_token):
    """A real interview, removed afterwards."""
    made = client.post("/interviews/generate", headers=auth(candidate_token), json={
        "interview_type": "HR", "domain": "hr executive",
        "difficulty": "EASY", "question_count": 1,
    })
    assert made.status_code == 201, made.text
    interview_id = made.json()["id"]
    yield interview_id
    client.delete(f"/interviews/{interview_id}", headers=auth(candidate_token))


class TestOwnership:
    def test_another_users_interview_is_not_found(self, client, recruiter_token, interview):
        """
        404 rather than 403 — a 403 would confirm the id exists, which is how
        every other interview route behaves.
        """
        r = client.post(
            f"/interviews/{interview}/behavior",
            headers=auth(recruiter_token),
            json=submission(),
        )
        assert r.status_code == 404

    def test_anonymous_is_rejected(self, client, interview):
        r = client.post(f"/interviews/{interview}/behavior", json=submission())
        assert r.status_code in (401, 403)


class TestStoringAReport:
    def test_stores_and_returns_the_report(self, client, candidate_token, interview):
        r = client.post(
            f"/interviews/{interview}/behavior",
            headers=auth(candidate_token),
            json=submission(),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["available"] is True
        assert body["eye_contact_percent"] == 100
        assert body["source"] == "live_tracking"

    def test_report_reaches_the_analysis_endpoint(self, client, candidate_token, interview):
        client.post(
            f"/interviews/{interview}/behavior",
            headers=auth(candidate_token),
            json=submission(),
        )
        analysis = client.get(
            f"/interviews/{interview}/analysis", headers=auth(candidate_token)
        ).json()

        assert analysis["behavior"] is not None
        assert analysis["behavior"]["eye_contact_percent"] == 100

    def test_behavior_is_null_before_anything_is_submitted(
        self, client, candidate_token, interview
    ):
        analysis = client.get(
            f"/interviews/{interview}/analysis", headers=auth(candidate_token)
        ).json()
        assert analysis["behavior"] is None

    def test_resubmitting_replaces_rather_than_appends(self, client, candidate_token, interview):
        client.post(
            f"/interviews/{interview}/behavior",
            headers=auth(candidate_token),
            json=submission(),
        )
        second = client.post(
            f"/interviews/{interview}/behavior",
            headers=auth(candidate_token),
            json=submission(count=100, gaze="down"),
        )
        assert second.json()["eye_contact_percent"] == 0

        analysis = client.get(
            f"/interviews/{interview}/analysis", headers=auth(candidate_token)
        ).json()
        assert analysis["behavior"]["eye_contact_percent"] == 0

    def test_a_short_session_is_stored_as_unavailable(self, client, candidate_token, interview):
        """Not enough tracking is a stored fact, not an error."""
        r = client.post(
            f"/interviews/{interview}/behavior",
            headers=auth(candidate_token),
            json=submission(count=5),
        )
        assert r.status_code == 200
        assert r.json()["available"] is False


class TestValidation:
    def test_unknown_gaze_label_is_rejected(self, client, candidate_token, interview):
        """
        A label the server does not know would silently vanish from every
        percentage, so it is a 422 rather than an ignored bucket.
        """
        r = client.post(
            f"/interviews/{interview}/behavior",
            headers=auth(candidate_token),
            json={
                "samples": [{"gaze": "elsewhere", "expression": "neutral", "face_present": True}],
                "tracked_seconds": 10,
            },
        )
        assert r.status_code == 422

    def test_absurd_sample_count_is_rejected(self, client, candidate_token, interview):
        r = client.post(
            f"/interviews/{interview}/behavior",
            headers=auth(candidate_token),
            json={
                "samples": [sample() for _ in range(20_001)],
                "tracked_seconds": 5000,
            },
        )
        assert r.status_code == 422

    def test_negative_tracked_seconds_is_rejected(self, client, candidate_token, interview):
        r = client.post(
            f"/interviews/{interview}/behavior",
            headers=auth(candidate_token),
            json={"samples": [sample()], "tracked_seconds": -1},
        )
        assert r.status_code == 422


class TestItStaysOutOfScoring:
    def test_submitting_behavior_does_not_change_the_interview_score(
        self, client, candidate_token, interview
    ):
        """
        Module 6 must never feed Module 5's score or the leaderboard — the
        samples are client-supplied, so anything ranked on them would be
        trivially forgeable.
        """
        before = client.get(f"/interviews/{interview}", headers=auth(candidate_token)).json()
        client.post(
            f"/interviews/{interview}/behavior",
            headers=auth(candidate_token),
            json=submission(),
        )
        after = client.get(f"/interviews/{interview}", headers=auth(candidate_token)).json()

        assert after["overall_score"] == before["overall_score"]
        assert after["score_rating"] == before["score_rating"]
