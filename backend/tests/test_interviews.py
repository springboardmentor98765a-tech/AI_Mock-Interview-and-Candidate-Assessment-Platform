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
