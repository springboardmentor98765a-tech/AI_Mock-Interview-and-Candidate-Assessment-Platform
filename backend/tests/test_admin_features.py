"""Tickets, platform settings, blocking and request telemetry."""

import httpx
import pytest

from .conftest import BASE, auth


# --------------------------------------------------------------- tickets

@pytest.fixture
def recruiter_id(client, candidate_token):
    """A real recruiter to report, taken from the directory endpoint."""
    r = client.get("/users/directory?role=RECRUITER", headers=auth(candidate_token))
    assert r.status_code == 200
    entries = r.json()
    if not entries:
        pytest.skip("no recruiter in the directory")
    return entries[0]["id"]


@pytest.fixture
def ticket(client, candidate_token, recruiter_id):
    r = client.post("/tickets", headers=auth(candidate_token), json={
        "against_id": recruiter_id, "reason": "Spam or scam", "details": "Automated test ticket."})
    assert r.status_code == 201, r.text
    return r.json()


class TestTickets:
    def test_create_returns_resolved_names(self, ticket):
        assert ticket["status"] == "OPEN"
        assert ticket["reporter_name"]
        assert ticket["against_name"]

    def test_reason_must_be_known(self, client, candidate_token, recruiter_id):
        r = client.post("/tickets", headers=auth(candidate_token), json={
            "against_id": recruiter_id, "reason": "Made up reason"})
        assert r.status_code == 422

    def test_cannot_report_yourself(self, client, candidate_token):
        me = client.get("/users/me", headers=auth(candidate_token)).json()
        r = client.post("/tickets", headers=auth(candidate_token), json={
            "against_id": me["id"], "reason": "Other"})
        assert r.status_code == 400

    def test_unknown_target_is_404(self, client, candidate_token):
        r = client.post("/tickets", headers=auth(candidate_token), json={
            "against_id": 99999999, "reason": "Other"})
        assert r.status_code == 404

    def test_reporter_sees_own_ticket(self, client, candidate_token, ticket):
        rows = client.get("/tickets", headers=auth(candidate_token)).json()
        assert ticket["id"] in [t["id"] for t in rows]

    def test_admin_sees_all_tickets(self, client, admin_token, ticket):
        rows = client.get("/tickets", headers=auth(admin_token)).json()
        assert ticket["id"] in [t["id"] for t in rows]

    def test_reported_user_cannot_read_the_report(self, client, recruiter_token, ticket):
        rows = client.get("/tickets", headers=auth(recruiter_token)).json()
        assert ticket["id"] not in [t["id"] for t in rows], \
            "a user can read a report filed against them"

    def test_only_admin_resolves(self, client, candidate_token, recruiter_token, ticket):
        for token in (candidate_token, recruiter_token):
            r = client.put(f"/tickets/{ticket['id']}/status", headers=auth(token),
                           json={"status": "RESOLVED"})
            assert r.status_code == 403

    def test_admin_resolves_and_persists(self, client, admin_token, ticket):
        r = client.put(f"/tickets/{ticket['id']}/status", headers=auth(admin_token),
                       json={"status": "RESOLVED"})
        assert r.status_code == 200
        assert r.json()["status"] == "RESOLVED"
        assert r.json()["resolved_at"] is not None

        rows = client.get("/tickets?status=RESOLVED", headers=auth(admin_token)).json()
        assert ticket["id"] in [t["id"] for t in rows], "resolution did not persist"

    def test_cannot_reopen(self, client, admin_token, ticket):
        r = client.put(f"/tickets/{ticket['id']}/status", headers=auth(admin_token),
                       json={"status": "OPEN"})
        assert r.status_code == 422


# -------------------------------------------------------------- settings

class TestSettings:
    def test_requires_admin(self, client, candidate_token):
        assert client.get("/settings", headers=auth(candidate_token)).status_code == 403

    def test_read_returns_defaults(self, client, admin_token):
        body = client.get("/settings", headers=auth(admin_token)).json()
        for key in ("max_questions", "session_minutes", "open_signup", "maintenance"):
            assert key in body

    def test_update_persists(self, client, admin_token):
        original = client.get("/settings", headers=auth(admin_token)).json()
        try:
            r = client.put("/settings", headers=auth(admin_token), json={"session_minutes": 45})
            assert r.status_code == 200
            assert r.json()["session_minutes"] == 45
            again = client.get("/settings", headers=auth(admin_token)).json()
            assert again["session_minutes"] == 45, "setting did not persist"
        finally:
            client.put("/settings", headers=auth(admin_token),
                       json={"session_minutes": original["session_minutes"]})

    def test_empty_update_is_400(self, client, admin_token):
        assert client.put("/settings", headers=auth(admin_token), json={}).status_code == 400

    def test_max_questions_is_enforced(self, client, admin_token, candidate_token):
        """The setting must actually cap generation, not just be stored."""
        original = client.get("/settings", headers=auth(admin_token)).json()["max_questions"]
        try:
            client.put("/settings", headers=auth(admin_token), json={"max_questions": 3})
            r = client.post("/interviews/generate", headers=auth(candidate_token), json={
                "interview_type": "HR", "domain": "cap probe",
                "difficulty": "EASY", "question_count": 10})
            assert r.status_code == 400, "max_questions setting is decorative"
            assert "at most 3" in r.json()["detail"]
        finally:
            client.put("/settings", headers=auth(admin_token),
                       json={"max_questions": original})

    def test_open_signup_is_enforced(self, client, admin_token, unique_email):
        original = client.get("/settings", headers=auth(admin_token)).json()["open_signup"]
        try:
            client.put("/settings", headers=auth(admin_token), json={"open_signup": False})
            r = client.post("/auth/register", json={
                "name": "Blocked Signup", "email": unique_email("closed"),
                "password": "Valid@Pass1", "role": "CANDIDATE"})
            assert r.status_code == 403, "open_signup setting is decorative"
        finally:
            client.put("/settings", headers=auth(admin_token),
                       json={"open_signup": original})

    def test_public_subset_needs_no_auth(self, client):
        r = client.get("/settings/public")
        assert r.status_code == 200
        assert set(r.json()) == {"open_signup", "maintenance"}


# -------------------------------------------------------------- blocking

class TestBlocking:
    def test_requires_admin(self, client, candidate_token):
        r = client.put("/users/1/block", headers=auth(candidate_token), json={"is_blocked": True})
        assert r.status_code == 403

    def test_admin_cannot_block_self(self, client, admin_token):
        me = client.get("/users/me", headers=auth(admin_token)).json()
        r = client.put(f"/users/{me['id']}/block", headers=auth(admin_token),
                       json={"is_blocked": True})
        assert r.status_code == 400

    def test_blocking_is_enforced_on_login_and_token(self, client, admin_token, unique_email):
        """A blocked user must lose access immediately, not when their JWT expires."""
        email = unique_email("blockme")
        client.post("/auth/register", json={
            "name": "Block Me", "email": email, "password": "Valid@Pass1", "role": "CANDIDATE"})
        login = client.post("/auth/login", json={"email": email, "password": "Valid@Pass1"})
        token = login.json()["access_token"]
        uid = login.json()["user"]["id"]

        assert client.get("/users/me", headers=auth(token)).status_code == 200

        r = client.put(f"/users/{uid}/block", headers=auth(admin_token), json={"is_blocked": True})
        assert r.status_code == 200
        assert r.json()["is_blocked"] is True

        # existing token stops working
        assert client.get("/users/me", headers=auth(token)).status_code == 403
        # and they cannot log in again
        assert client.post("/auth/login",
                           json={"email": email, "password": "Valid@Pass1"}).status_code == 403

        # unblock restores access
        client.put(f"/users/{uid}/block", headers=auth(admin_token), json={"is_blocked": False})
        assert client.post("/auth/login",
                           json={"email": email, "password": "Valid@Pass1"}).status_code == 200


# -------------------------------------------------------------- directory

class TestDirectory:
    def test_lists_recruiters_without_emails(self, client, candidate_token):
        rows = client.get("/users/directory?role=RECRUITER", headers=auth(candidate_token)).json()
        for row in rows:
            assert set(row) == {"id", "name", "role"}, "directory leaks extra fields"
            assert row["role"] == "RECRUITER"

    def test_admins_are_not_listed(self, client, candidate_token):
        r = client.get("/users/directory?role=ADMIN", headers=auth(candidate_token))
        assert r.status_code == 403

    def test_requires_auth(self, client):
        assert client.get("/users/directory?role=RECRUITER").status_code == 401


# --------------------------------------------------------------- metrics

class TestMetrics:
    def test_requires_admin(self, client, candidate_token):
        assert client.get("/metrics", headers=auth(candidate_token)).status_code == 403

    def test_reports_real_measured_traffic(self, client, admin_token):
        before = client.get("/metrics", headers=auth(admin_token)).json()
        for _ in range(3):
            client.get("/health")
        after = client.get("/metrics", headers=auth(admin_token)).json()

        assert after["total_requests"] > before["total_requests"], "middleware records nothing"
        assert after["avg_latency_ms"] > 0
        assert "window_start" in after

    def test_endpoints_are_real_route_templates(self, client, admin_token):
        body = client.get("/metrics", headers=auth(admin_token)).json()
        paths = " ".join(e["endpoint"] for e in body["endpoints"])
        assert "/api/v1/" not in paths, "invented /api/v1 paths in telemetry"
        assert any("/api/health" in e["endpoint"] for e in body["endpoints"])

    def test_response_time_header_present(self, client):
        r = client.get("/health")
        assert "X-Response-Time-ms" in r.headers
        assert float(r.headers["X-Response-Time-ms"]) >= 0

    def test_errors_are_counted(self, client, admin_token):
        before = client.get("/metrics", headers=auth(admin_token)).json()["total_errors"]
        client.get("/interviews/99999999", headers=auth(admin_token))
        after = client.get("/metrics", headers=auth(admin_token)).json()["total_errors"]
        assert after > before, "4xx responses are not counted as errors"
