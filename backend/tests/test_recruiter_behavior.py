"""
What a recruiter can and cannot see of Module 6.

The filtering is the point of these tests. A recruiter reviewing a session
sees attention context beside the score; they do not see expression or emotion
readings, because those do not measure reliably enough to inform a decision
about a person. If that ever silently changes, one of these fails.
"""

import pytest

from .conftest import auth


@pytest.fixture(scope="module")
def db():
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    import app.main  # noqa: F401 — registers every model
    from app.db.session import SessionLocal

    session = SessionLocal()
    yield session
    session.close()


REPORT = {
    "available": True,
    "source": "live_tracking",
    "method_note": "candidate-facing note",
    "confidence": "Nervous",
    "emotions": {"nervous": 70, "confident": 30},
    "confidence_percent": 34,
    "eye_contact_percent": 64,
    "look_aways": 3,
    "engagement": "Medium",
    "summary": "You looked away several times and read as uncomfortable.",
    "gaze_breakdown": {"camera": 64, "down": 25, "side": 8, "away": 3},
    "face_present_percent": 97,
    "samples": 400,
    "tracked_seconds": 100.0,
    "alerts_shown": 2,
}


@pytest.fixture
def scored_session(client, candidate_token, db):
    """A completed, scored interview carrying a full behaviour report."""
    from datetime import datetime, timezone

    from app.models.interview import Interview, SessionStatus

    made = client.post("/interviews/generate", headers=auth(candidate_token), json={
        "interview_type": "HR", "domain": "hr executive",
        "difficulty": "EASY", "question_count": 1,
    })
    interview_id = made.json()["id"]

    row = db.query(Interview).filter(Interview.id == interview_id).one()
    row.status = SessionStatus.COMPLETED
    row.started_at = datetime.now(timezone.utc)
    row.completed_at = datetime.now(timezone.utc)
    row.overall_score = 71.0
    row.behavior_report = REPORT
    db.commit()

    yield row.user_id, interview_id

    client.delete(f"/interviews/{interview_id}", headers=auth(candidate_token))


def find(rows, interview_id):
    return next((r for r in rows if r["interview_id"] == interview_id), None)


class TestAccess:
    def test_candidates_cannot_read_this(self, client, candidate_token, scored_session):
        user_id, _ = scored_session
        r = client.get(
            f"/analytics/recruiter/candidates/{user_id}/interviews",
            headers=auth(candidate_token),
        )
        assert r.status_code == 403

    def test_recruiter_and_admin_can(self, client, recruiter_token, admin_token, scored_session):
        user_id, _ = scored_session
        for token in (recruiter_token, admin_token):
            r = client.get(
                f"/analytics/recruiter/candidates/{user_id}/interviews", headers=auth(token)
            )
            assert r.status_code == 200

    def test_unknown_candidate_is_404(self, client, recruiter_token):
        r = client.get(
            "/analytics/recruiter/candidates/2000000000/interviews",
            headers=auth(recruiter_token),
        )
        assert r.status_code == 404


class TestWhatIsShown:
    def test_score_and_attention_appear_together(self, client, recruiter_token, scored_session):
        user_id, interview_id = scored_session
        rows = client.get(
            f"/analytics/recruiter/candidates/{user_id}/interviews", headers=auth(recruiter_token)
        ).json()
        row = find(rows, interview_id)

        assert row is not None
        assert row["overall_score"] == 71.0
        assert row["score_rating"] == "Average"
        assert row["attention"]["eye_contact_percent"] == 64
        assert row["attention"]["look_aways"] == 3
        assert row["attention"]["engagement"] == "Medium"

    def test_no_camera_shows_as_absent_not_zero(self, client, recruiter_token, candidate_token, db):
        """No tracking is missing data, not an attention score of zero."""
        from datetime import datetime, timezone

        from app.models.interview import Interview, SessionStatus

        made = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 1,
        })
        interview_id = made.json()["id"]
        try:
            row = db.query(Interview).filter(Interview.id == interview_id).one()
            row.status = SessionStatus.COMPLETED
            row.completed_at = datetime.now(timezone.utc)
            db.commit()

            rows = client.get(
                f"/analytics/recruiter/candidates/{row.user_id}/interviews",
                headers=auth(recruiter_token),
            ).json()
            assert find(rows, interview_id)["attention"] is None
        finally:
            client.delete(f"/interviews/{interview_id}", headers=auth(candidate_token))


class TestWhatIsWithheld:
    """
    Named emotion readings stay out. A percentage carries its uncertainty
    visibly; a word like "nervous" beside someone's name does not, and a
    recruiter will remember the word long after any caveat.
    """

    def test_named_emotion_readings_never_reach_a_recruiter(
        self, client, recruiter_token, scored_session
    ):
        user_id, interview_id = scored_session
        rows = client.get(
            f"/analytics/recruiter/candidates/{user_id}/interviews", headers=auth(recruiter_token)
        ).json()
        attention = find(rows, interview_id)["attention"]

        for withheld in ("emotions", "confidence", "summary"):
            assert withheld not in attention, (
                f"{withheld!r} reached a recruiter — a named emotion beside "
                "someone's name outlives its caveat"
            )

    def test_confidence_percentage_does_reach_a_recruiter(
        self, client, recruiter_token, scored_session
    ):
        """Included by product decision — with the caveat travelling beside it."""
        user_id, interview_id = scored_session
        rows = client.get(
            f"/analytics/recruiter/candidates/{user_id}/interviews", headers=auth(recruiter_token)
        ).json()
        assert find(rows, interview_id)["attention"]["confidence_percent"] == 34

    def test_the_candidates_own_view_still_has_everything(
        self, client, candidate_token, scored_session
    ):
        """Filtering is for the recruiter view only; the candidate keeps their full report."""
        _, interview_id = scored_session
        body = client.get(
            f"/interviews/{interview_id}/analysis", headers=auth(candidate_token)
        ).json()
        assert body["behavior"]["emotions"] == {"nervous": 70, "confident": 30}
        assert body["behavior"]["summary"]

    def test_recruiter_note_warns_about_what_these_numbers_are(
        self, client, recruiter_token, scored_session
    ):
        user_id, interview_id = scored_session
        rows = client.get(
            f"/analytics/recruiter/candidates/{user_id}/interviews", headers=auth(recruiter_token)
        ).json()
        note = find(rows, interview_id)["attention"]["method_note"].lower()

        assert "estimate" in note
        assert "neurodivergence" in note, "the fairness caveat must travel with the data"
        assert "uncalibrated" in note, (
            "the confidence percentage is uncalibrated and the note must say so — "
            "it is the one recruiter-visible figure not derived from measured gaze"
        )


class TestItDoesNotRank:
    def test_leaderboard_carries_no_attention_data(self, client, recruiter_token, scored_session):
        """
        Context when reading about a person, never a number that sorts people —
        these figures come from the candidate's own browser and are forgeable.
        """
        board = client.get("/analytics/leaderboard", headers=auth(recruiter_token)).json()
        for entry in board:
            blob = str(entry).lower()
            for banned in ("eye_contact", "look_away", "attention", "gaze"):
                assert banned not in blob

    def test_candidate_directory_carries_no_attention_data(self, client, recruiter_token):
        rows = client.get(
            "/analytics/recruiter/candidates", headers=auth(recruiter_token)
        ).json()
        for row in rows:
            blob = str(row).lower()
            for banned in ("eye_contact", "look_away", "gaze"):
                assert banned not in blob


class TestBehaviorNeverReachesTheScore:
    """
    The invariant TestItDoesNotRank cannot see.

    That class checks no attention *field* appears in the leaderboard payload.
    It cannot catch a design where behaviour data moves `overall_score`, because
    what travels then is a number, not a field name — and a number that can move
    someone across a rating band is exactly what these samples must never do:
    they come from the candidate's own browser and are forgeable.

    `apply_behavior_modifier` still exists and is still used — for the
    candidate-facing `confidence_note` on their own report. What is forbidden is
    any write path from it into the score.
    """

    def test_submitting_a_report_does_not_change_overall_score(
        self, client, candidate_token, db, scored_session
    ):
        """The end-to-end version: post real samples, score must not move."""
        from app.models.interview import Interview

        _, interview_id = scored_session
        before = db.query(Interview).filter(Interview.id == interview_id).one().overall_score

        posted = client.post(
            f"/interviews/{interview_id}/behavior",
            headers=auth(candidate_token),
            json={
                "samples": [
                    {"gaze": "camera", "expression": "confident",
                     "face_present": True, "confidence": 0.9}
                ] * 400,
                "tracked_seconds": 300.0,
                "alerts_shown": 0,
            },
        )
        assert posted.status_code == 200, posted.text

        db.expire_all()
        after = db.query(Interview).filter(Interview.id == interview_id).one().overall_score
        assert after == before, (
            "posting a behaviour report moved overall_score — camera data is "
            "forgeable and must never touch a number that ranks people"
        )

    def test_aggregate_score_takes_no_behavior_argument(self):
        """
        Structural, so the path cannot be quietly re-added: neither scoring
        entry point may accept behaviour data at all.
        """
        import inspect

        from app.services import scoring

        for fn in (scoring.aggregate_score, scoring.answer_overall):
            params = set(inspect.signature(fn).parameters)
            assert not any("behavior" in p or "behaviour" in p for p in params), (
                f"{fn.__name__} accepts behaviour data; the scoring path must not see it"
            )

    def test_confidence_axis_is_untouched_by_behaviour(self):
        """The same answer scores identically whatever the camera saw."""
        from app.services.scoring import answer_overall

        answer = {
            "available": True, "communication": 80, "confidence": 50,
            "technical_relevance": 70, "professionalism": 60,
        }
        # 80(.30) + 50(.25) + 70(.30) + 60(.15)
        assert answer_overall(answer) == 66.5

    def test_modifier_still_serves_the_candidate_facing_note(self):
        """
        It is not dead code — it produces `confidence_note`, which nothing
        aggregates or ranks on.
        """
        from app.services.scoring import BEHAVIOR_MODIFIER_CAP, apply_behavior_modifier

        strong = {**REPORT, "eye_contact_percent": 100, "engagement": "High"}
        assert apply_behavior_modifier(50, strong) > 50
        assert apply_behavior_modifier(50, strong) - 50 <= BEHAVIOR_MODIFIER_CAP
        assert apply_behavior_modifier(50, None) == 50
        assert apply_behavior_modifier(50, {**REPORT, "tracked_seconds": 12.0}) == 50

    def test_confidence_note_is_not_visible_to_recruiters(self, client, recruiter_token, scored_session):
        """It is candidate-facing; the recruiter allowlist must keep it out."""
        candidate_id, _ = scored_session
        rows = client.get(
            f"/analytics/recruiter/candidates/{candidate_id}/interviews",
            headers=auth(recruiter_token),
        ).json()
        assert "confidence_note" not in str(rows)

    def test_leaderboard_still_exposes_no_attention_fields(self, client, recruiter_token, scored_session):
        board = client.get("/analytics/leaderboard", headers=auth(recruiter_token)).json()
        for entry in board:
            blob = str(entry).lower()
            for banned in ("eye_contact", "look_away", "attention", "gaze", "engagement"):
                assert banned not in blob
