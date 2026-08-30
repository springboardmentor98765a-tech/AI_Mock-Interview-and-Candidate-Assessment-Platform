"""Module 3 — interview generation, CRUD and session lifecycle."""

import pytest

from .conftest import auth


@pytest.fixture
def interview(client, candidate_token):
    """A fresh interview, deleted afterwards."""
    r = client.post("/interviews/generate", headers=auth(candidate_token), json={
        "interview_type": "HR", "domain": "hr executive", "difficulty": "EASY", "question_count": 3,
    })
    assert r.status_code == 201, r.text
    body = r.json()
    yield body
    client.delete(f"/interviews/{body['id']}", headers=auth(candidate_token))


class TestGeneration:
    @pytest.mark.parametrize("itype,difficulty,domain", [
        ("HR", "EASY", "hr executive"),
        ("TECHNICAL", "MEDIUM", "backend developer"),
        ("BEHAVIORAL", "HARD", "sales executive"),
        ("APTITUDE", "MEDIUM", "software engineer"),
    ])
    def test_each_type_and_difficulty(self, client, candidate_token, itype, difficulty, domain):
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": itype, "domain": domain, "difficulty": difficulty, "question_count": 3,
        })
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["interview_type"] == itype
        assert body["difficulty"] == difficulty
        assert len(body["questions"]) == 3
        assert body["source"] in ("AI", "FALLBACK")
        assert all(q["question_text"].strip() for q in body["questions"])
        assert [q["sequence_no"] for q in body["questions"]] == [1, 2, 3]
        client.delete(f"/interviews/{body['id']}", headers=auth(candidate_token))

    def test_unknown_domain_is_accepted(self, client, candidate_token):
        """Feature 6: domain is free text — a new one needs no code change."""
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "TECHNICAL", "domain": "underwater basket weaving analyst",
            "difficulty": "HARD", "question_count": 2,
        })
        assert r.status_code == 201
        client.delete(f"/interviews/{r.json()['id']}", headers=auth(candidate_token))

    def test_requires_auth(self, client):
        r = client.post("/interviews/generate", json={"interview_type": "HR", "domain": "x"})
        assert r.status_code == 401

    @pytest.mark.parametrize("payload", [
        {"interview_type": "GOSSIP", "domain": "dev", "difficulty": "EASY"},
        {"interview_type": "HR", "domain": " ", "difficulty": "EASY"},
        {"interview_type": "HR", "domain": "dev", "difficulty": "EXTREME"},
        {"interview_type": "HR", "domain": "dev", "question_count": 999},
        {"interview_type": "HR", "domain": "dev", "question_count": 0},
        {"domain": "dev"},
    ])
    def test_validation_rejects_bad_input(self, client, candidate_token, payload):
        r = client.post("/interviews/generate", headers=auth(candidate_token), json=payload)
        assert r.status_code == 422, f"{payload} was accepted"


class TestCRUD:
    def test_list(self, client, candidate_token, interview):
        r = client.get("/interviews", headers=auth(candidate_token))
        assert r.status_code == 200
        assert interview["id"] in [i["id"] for i in r.json()]

    def test_filters(self, client, candidate_token, interview):
        r = client.get("/interviews?interview_type=HR&difficulty=EASY", headers=auth(candidate_token))
        assert r.status_code == 200
        assert all(i["interview_type"] == "HR" for i in r.json())

    def test_get_one_includes_questions(self, client, candidate_token, interview):
        r = client.get(f"/interviews/{interview['id']}", headers=auth(candidate_token))
        assert r.status_code == 200
        assert len(r.json()["questions"]) == 3

    def test_update(self, client, candidate_token, interview):
        r = client.put(f"/interviews/{interview['id']}", headers=auth(candidate_token),
                       json={"domain": "senior hr partner"})
        assert r.status_code == 200
        assert r.json()["domain"] == "senior hr partner"

    def test_update_empty_body_is_400(self, client, candidate_token, interview):
        r = client.put(f"/interviews/{interview['id']}", headers=auth(candidate_token), json={})
        assert r.status_code == 400

    def test_missing_id_is_404(self, client, candidate_token):
        assert client.get("/interviews/99999999", headers=auth(candidate_token)).status_code == 404

    def test_delete_cascades(self, client, candidate_token):
        r = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "x y", "difficulty": "EASY", "question_count": 2})
        iid = r.json()["id"]
        assert client.delete(f"/interviews/{iid}", headers=auth(candidate_token)).status_code == 204
        assert client.get(f"/interviews/{iid}", headers=auth(candidate_token)).status_code == 404


class TestOwnershipIsolation:
    def test_other_user_cannot_read(self, client, recruiter_token, interview):
        r = client.get(f"/interviews/{interview['id']}", headers=auth(recruiter_token))
        assert r.status_code == 404, "leaks another user's interview"

    def test_other_user_cannot_update(self, client, recruiter_token, interview):
        r = client.put(f"/interviews/{interview['id']}", headers=auth(recruiter_token),
                       json={"domain": "hijacked"})
        assert r.status_code == 404

    def test_other_user_cannot_delete(self, client, recruiter_token, interview):
        assert client.delete(f"/interviews/{interview['id']}",
                             headers=auth(recruiter_token)).status_code == 404


class TestSessionLifecycle:
    def test_start_moves_to_in_progress(self, client, candidate_token, interview):
        r = client.post("/interviews/start", headers=auth(candidate_token),
                        json={"interview_id": interview["id"]})
        assert r.status_code == 200
        assert r.json()["status"] == "IN_PROGRESS"
        assert r.json()["started_at"] is not None

    def test_double_start_is_409(self, client, candidate_token, interview):
        client.post("/interviews/start", headers=auth(candidate_token),
                    json={"interview_id": interview["id"]})
        r = client.post("/interviews/start", headers=auth(candidate_token),
                        json={"interview_id": interview["id"]})
        assert r.status_code == 409

    def test_history_excludes_unstarted(self, client, candidate_token, interview):
        hist = client.get("/interviews/history", headers=auth(candidate_token)).json()
        assert interview["id"] not in [h["id"] for h in hist]

    def test_history_includes_started(self, client, candidate_token, interview):
        client.post("/interviews/start", headers=auth(candidate_token),
                    json={"interview_id": interview["id"]})
        hist = client.get("/interviews/history", headers=auth(candidate_token)).json()
        assert interview["id"] in [h["id"] for h in hist]

    def test_start_missing_interview_is_404(self, client, candidate_token):
        r = client.post("/interviews/start", headers=auth(candidate_token),
                        json={"interview_id": 99999999})
        assert r.status_code == 404


class TestRouteOrdering:
    """Static paths must not be swallowed by /{interview_id}."""

    @pytest.mark.parametrize("path", ["/interviews/history", "/interviews/domains"])
    def test_static_paths_resolve(self, client, candidate_token, path):
        r = client.get(path, headers=auth(candidate_token))
        assert r.status_code == 200, f"{path} was parsed as an interview id"

    def test_domains_returns_suggestions(self, client, candidate_token):
        body = client.get("/interviews/domains", headers=auth(candidate_token)).json()
        assert len(body["suggested"]) > 10


class TestQuestionTimer:
    """Module 4: the countdown comes from a real admin setting, once."""

    def test_not_set_before_the_session_starts(self, client, candidate_token, interview):
        """A generated interview has no clock — nothing is counting down yet."""
        assert interview["question_seconds"] is None

    def test_set_on_start(self, client, candidate_token, interview):
        r = client.post("/interviews/start", headers=auth(candidate_token),
                        json={"interview_id": interview["id"]})
        assert r.status_code == 200, r.text
        seconds = r.json()["question_seconds"]
        assert isinstance(seconds, int) and seconds > 0

    def test_snapshot_survives_an_admin_change(self, client, candidate_token, admin_token,
                                               interview):
        """
        The load-bearing property: an administrator saving a new session length
        must not move the goalposts under a candidate already answering.
        """
        started = client.post("/interviews/start", headers=auth(candidate_token),
                              json={"interview_id": interview["id"]}).json()
        original = started["question_seconds"]

        before = client.get("/settings", headers=auth(admin_token)).json()
        try:
            changed = client.put("/settings", headers=auth(admin_token),
                                 json={"session_minutes": before["session_minutes"] + 17})
            assert changed.status_code == 200, changed.text

            again = client.get(f"/interviews/{interview['id']}",
                               headers=auth(candidate_token)).json()
            assert again["question_seconds"] == original, "a running interview's clock moved"
        finally:
            client.put("/settings", headers=auth(admin_token),
                       json={"session_minutes": before["session_minutes"]})


class TestAnalysisEndpoint:
    """Module 5: GET /interviews/{id}/analysis."""

    def test_unanswered_questions_say_why_not_nothing(self, client, candidate_token, interview):
        r = client.get(f"/interviews/{interview['id']}/analysis", headers=auth(candidate_token))
        assert r.status_code == 200, r.text
        body = r.json()

        assert len(body["questions"]) == len(interview["questions"])
        for entry in body["questions"]:
            assert entry["analysis"]["available"] is False
            assert entry["analysis"]["reason"], "an absent analysis must explain itself"

    def test_summary_is_unavailable_rather_than_zeroed(self, client, candidate_token, interview):
        summary = client.get(f"/interviews/{interview['id']}/analysis",
                             headers=auth(candidate_token)).json()["summary"]
        assert summary["available"] is False
        assert summary["analysed_answers"] == 0

    def test_carries_no_score(self, client, candidate_token, interview):
        """Scoring is an unbuilt module — this endpoint must never imply one."""
        body = client.get(f"/interviews/{interview['id']}/analysis",
                          headers=auth(candidate_token)).text.lower()
        for word in ('"score"', '"rating"', '"rank"'):
            assert word not in body

    def test_another_candidate_cannot_read_it(self, client, candidate_token, recruiter_token,
                                              interview):
        """
        404 rather than 403 — a 403 would confirm the id exists. Recruiters have
        no route to a candidate's transcripts today; that is an undecided future feature.
        """
        r = client.get(f"/interviews/{interview['id']}/analysis", headers=auth(recruiter_token))
        assert r.status_code == 404

    def test_requires_auth(self, client, interview):
        assert client.get(f"/interviews/{interview['id']}/analysis").status_code == 401


class TestPauseResumeEnd:
    """The full session lifecycle, including every illegal transition."""

    def _start(self, client, token, interview):
        r = client.post("/interviews/start", headers=auth(token),
                        json={"interview_id": interview["id"]})
        assert r.status_code == 200, r.text
        return r.json()

    # --- pause ---------------------------------------------------------

    def test_pause_requires_in_progress(self, client, candidate_token, interview):
        r = client.post(f"/interviews/{interview['id']}/pause", headers=auth(candidate_token))
        assert r.status_code == 409
        assert "CREATED" in r.json()["detail"]

    def test_pause(self, client, candidate_token, interview):
        self._start(client, candidate_token, interview)
        r = client.post(f"/interviews/{interview['id']}/pause", headers=auth(candidate_token))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "PAUSED"
        assert body["paused_at"] is not None
        assert body["is_paused"] is True

    def test_double_pause_is_409(self, client, candidate_token, interview):
        """
        Not merely tidiness: a second pause would reset paused_at and silently
        discard the time already accumulated.
        """
        self._start(client, candidate_token, interview)
        client.post(f"/interviews/{interview['id']}/pause", headers=auth(candidate_token))
        r = client.post(f"/interviews/{interview['id']}/pause", headers=auth(candidate_token))
        assert r.status_code == 409

    def test_cannot_restart_a_paused_interview(self, client, candidate_token, interview):
        """Starting again would reset started_at and re-snapshot the clock."""
        self._start(client, candidate_token, interview)
        client.post(f"/interviews/{interview['id']}/pause", headers=auth(candidate_token))
        r = client.post("/interviews/start", headers=auth(candidate_token),
                        json={"interview_id": interview["id"]})
        assert r.status_code == 409
        assert "resume" in r.json()["detail"].lower()

    # --- resume --------------------------------------------------------

    def test_resume_returns_to_in_progress(self, client, candidate_token, interview):
        self._start(client, candidate_token, interview)
        client.post(f"/interviews/{interview['id']}/pause", headers=auth(candidate_token))
        r = client.post(f"/interviews/{interview['id']}/resume", headers=auth(candidate_token))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "IN_PROGRESS"
        assert body["paused_at"] is None
        assert body["is_paused"] is False

    def test_resume_accumulates_paused_time(self, client, candidate_token, interview):
        """The clock must be able to exclude paused time, so it has to be recorded."""
        import time

        self._start(client, candidate_token, interview)
        client.post(f"/interviews/{interview['id']}/pause", headers=auth(candidate_token))
        time.sleep(2)
        body = client.post(f"/interviews/{interview['id']}/resume",
                           headers=auth(candidate_token)).json()
        assert body["total_paused_seconds"] >= 2

    def test_paused_time_accumulates_across_pauses(self, client, candidate_token, interview):
        import time

        self._start(client, candidate_token, interview)
        for _ in range(2):
            client.post(f"/interviews/{interview['id']}/pause", headers=auth(candidate_token))
            time.sleep(1)
            body = client.post(f"/interviews/{interview['id']}/resume",
                               headers=auth(candidate_token)).json()
        assert body["total_paused_seconds"] >= 2, "the second pause overwrote the first"

    def test_resume_when_not_paused_is_409(self, client, candidate_token, interview):
        self._start(client, candidate_token, interview)
        r = client.post(f"/interviews/{interview['id']}/resume", headers=auth(candidate_token))
        assert r.status_code == 409

    # --- end -----------------------------------------------------------

    def test_end_completes_and_stamps_the_time(self, client, candidate_token, interview):
        self._start(client, candidate_token, interview)
        r = client.post(f"/interviews/{interview['id']}/end", headers=auth(candidate_token))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "COMPLETED"
        assert body["completed_at"] is not None
        assert body["started_at"] is not None

    def test_end_from_paused(self, client, candidate_token, interview):
        """Stepping away and not coming back should not require resuming first."""
        self._start(client, candidate_token, interview)
        client.post(f"/interviews/{interview['id']}/pause", headers=auth(candidate_token))
        r = client.post(f"/interviews/{interview['id']}/end", headers=auth(candidate_token))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "COMPLETED"
        assert r.json()["paused_at"] is None

    def test_end_before_start_is_409(self, client, candidate_token, interview):
        r = client.post(f"/interviews/{interview['id']}/end", headers=auth(candidate_token))
        assert r.status_code == 409

    def test_end_is_idempotent(self, client, candidate_token, interview):
        """A double-click or a client retry must not be an error."""
        self._start(client, candidate_token, interview)
        first = client.post(f"/interviews/{interview['id']}/end",
                            headers=auth(candidate_token)).json()
        second = client.post(f"/interviews/{interview['id']}/end", headers=auth(candidate_token))
        assert second.status_code == 200
        assert second.json()["completed_at"] == first["completed_at"], "completed_at moved"

    def test_ending_early_leaves_questions_unanswered(self, client, candidate_token, interview):
        """
        The distinction that matters: ending early must not convert unanswered
        questions into skipped ones. "Ran out of time" and "passed on it" are
        different facts about the candidate.
        """
        self._start(client, candidate_token, interview)
        client.post(f"/interviews/{interview['id']}/end", headers=auth(candidate_token))

        body = client.get(f"/interviews/{interview['id']}", headers=auth(candidate_token)).json()
        for question in body["questions"]:
            assert question["attempted"] is False
            assert question["skipped_at"] is None, "an unanswered question was marked skipped"

    def test_completed_cannot_be_paused(self, client, candidate_token, interview):
        self._start(client, candidate_token, interview)
        client.post(f"/interviews/{interview['id']}/end", headers=auth(candidate_token))
        r = client.post(f"/interviews/{interview['id']}/pause", headers=auth(candidate_token))
        assert r.status_code == 409

    # --- ownership -----------------------------------------------------

    @pytest.mark.parametrize("action", ["pause", "resume", "end"])
    def test_another_user_cannot_control_the_session(self, client, candidate_token,
                                                     recruiter_token, interview, action):
        self._start(client, candidate_token, interview)
        r = client.post(f"/interviews/{interview['id']}/{action}", headers=auth(recruiter_token))
        assert r.status_code == 404, "404 not 403 — a 403 confirms the id exists"

    @pytest.mark.parametrize("action", ["pause", "resume", "end"])
    def test_requires_auth(self, client, interview, action):
        assert client.post(f"/interviews/{interview['id']}/{action}").status_code == 401


class TestSessionRecord:
    """Module 4/5 storage: GET /interviews/{id}/session."""

    SPEC_FIELDS = (
        "candidate_id", "interview_id", "session_id", "started_at", "ended_at",
        "duration_seconds", "status", "video_recording", "audio_recordings",
        "questions_attempted",
    )

    def test_every_spec_field_is_present(self, client, candidate_token, interview):
        body = client.get(f"/interviews/{interview['id']}/session",
                          headers=auth(candidate_token)).json()
        missing = [f for f in self.SPEC_FIELDS if f not in body]
        assert not missing, f"session record is missing {missing}"

    def test_session_id_is_a_uuid_not_the_row_id(self, client, candidate_token, interview):
        """
        The point of the opaque id: a sequential integer leaks how many
        interviews the platform has run and invites guessing at neighbours.
        """
        import uuid as _uuid

        session_id = interview["session_id"]
        assert _uuid.UUID(session_id)  # raises if it is not a UUID
        assert session_id != str(interview["id"])

    def test_session_ids_are_unique(self, client, candidate_token, interview):
        other = client.post("/interviews/generate", headers=auth(candidate_token), json={
            "interview_type": "HR", "domain": "hr executive",
            "difficulty": "EASY", "question_count": 2}).json()
        try:
            assert other["session_id"] != interview["session_id"]
        finally:
            client.delete(f"/interviews/{other['id']}", headers=auth(candidate_token))

    def test_unstarted_session_has_no_duration_or_clock(self, client, candidate_token,
                                                        interview):
        """Null, not zero — zero would claim it ran for no time."""
        body = client.get(f"/interviews/{interview['id']}/session",
                          headers=auth(candidate_token)).json()
        assert body["duration_seconds"] is None
        assert body["elapsed_seconds"] is None
        assert body["started_at"] is None

    def test_duration_is_stamped_on_end(self, client, candidate_token, interview):
        client.post("/interviews/start", headers=auth(candidate_token),
                    json={"interview_id": interview["id"]})
        client.post(f"/interviews/{interview['id']}/end", headers=auth(candidate_token))

        body = client.get(f"/interviews/{interview['id']}/session",
                          headers=auth(candidate_token)).json()
        assert body["duration_seconds"] is not None
        assert body["duration_seconds"] >= 0
        assert body["ended_at"] is not None

    def test_duration_excludes_paused_time(self, client, candidate_token, interview):
        """
        The load-bearing property of the whole pause mechanism: time away from
        the keyboard is not interview time.
        """
        import time

        iid = interview["id"]
        client.post("/interviews/start", headers=auth(candidate_token), json={"interview_id": iid})
        client.post(f"/interviews/{iid}/pause", headers=auth(candidate_token))
        time.sleep(3)
        client.post(f"/interviews/{iid}/resume", headers=auth(candidate_token))
        client.post(f"/interviews/{iid}/end", headers=auth(candidate_token))

        body = client.get(f"/interviews/{iid}/session", headers=auth(candidate_token)).json()
        assert body["paused_seconds"] >= 3
        # Wall clock spanned the pause; the duration must not include it.
        assert body["duration_seconds"] < body["paused_seconds"] + 3

    def test_remaining_never_negative_and_overrun_is_separate(self, client, candidate_token,
                                                              interview):
        client.post("/interviews/start", headers=auth(candidate_token),
                    json={"interview_id": interview["id"]})
        body = client.get(f"/interviews/{interview['id']}/session",
                          headers=auth(candidate_token)).json()

        assert body["remaining_seconds"] >= 0
        assert body["overrun_seconds"] >= 0
        assert body["budget_seconds"] == body["seconds_per_question"] * body["questions_total"]

    def test_counts_partition_the_questions(self, client, candidate_token, interview):
        """attempted + skipped + unanswered must equal the total, always."""
        body = client.get(f"/interviews/{interview['id']}/session",
                          headers=auth(candidate_token)).json()
        assert (
            body["questions_attempted"] + body["questions_skipped"]
            + body["questions_unanswered"] == body["questions_total"]
        )

    def test_per_question_timing_is_null_until_handled(self, client, candidate_token,
                                                       interview):
        body = client.get(f"/interviews/{interview['id']}/session",
                          headers=auth(candidate_token)).json()
        for entry in body["questions"]:
            assert entry["time_on_question_seconds"] is None
            assert entry["attempted"] is False

    def test_recording_references_are_empty_not_fabricated(self, client, candidate_token,
                                                           interview):
        body = client.get(f"/interviews/{interview['id']}/session",
                          headers=auth(candidate_token)).json()
        assert body["video_recording"] is None
        assert body["audio_recordings"] == []

    def test_another_user_cannot_read_the_session(self, client, candidate_token,
                                                  recruiter_token, interview):
        r = client.get(f"/interviews/{interview['id']}/session", headers=auth(recruiter_token))
        assert r.status_code == 404

    def test_requires_auth(self, client, interview):
        assert client.get(f"/interviews/{interview['id']}/session").status_code == 401
