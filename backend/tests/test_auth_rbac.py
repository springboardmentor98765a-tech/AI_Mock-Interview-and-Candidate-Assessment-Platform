"""Auth and role-based access control."""

import httpx
import pytest

from .conftest import ADMIN, BASE, CANDIDATE, auth


class TestAuth:
    def test_health_is_public(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_login_returns_jwt_and_user(self, client):
        r = client.post("/auth/login", json={"email": CANDIDATE[0], "password": CANDIDATE[1]})
        assert r.status_code == 200
        body = r.json()
        assert body["token_type"] == "bearer"
        assert body["access_token"].count(".") == 2, "not a JWT"
        assert body["user"]["role"] == "CANDIDATE"
        assert "password" not in body["user"], "password field leaked in response"

    def test_login_wrong_password_is_401(self, client):
        r = client.post("/auth/login", json={"email": CANDIDATE[0], "password": "WrongPass@1"})
        assert r.status_code == 401

    def test_login_unknown_email_is_401_with_same_message(self, client):
        """Must not reveal whether the address exists."""
        unknown = client.post("/auth/login", json={"email": "nobody.at.all@example.com", "password": "x"})
        wrong = client.post("/auth/login", json={"email": CANDIDATE[0], "password": "WrongPass@1"})
        assert unknown.status_code == wrong.status_code == 401
        assert unknown.json()["detail"] == wrong.json()["detail"], "response enumerates emails"

    def test_register_rejects_weak_password(self, client, unique_email):
        r = client.post("/auth/register", json={
            "name": "Weak Pass", "email": unique_email("weak"), "password": "abc", "role": "CANDIDATE",
        })
        assert r.status_code == 422

    def test_register_rejects_self_service_admin(self, client, unique_email):
        """Nobody may make themselves an administrator."""
        r = client.post("/auth/register", json={
            "name": "Sneaky", "email": unique_email("admin"), "password": "Valid@Pass1", "role": "ADMIN",
        })
        assert r.status_code == 403

    def test_register_then_login(self, client, unique_email):
        email = unique_email("newbie")
        r = client.post("/auth/register", json={
            "name": "New Bie", "email": email, "password": "Valid@Pass1", "role": "CANDIDATE",
        })
        assert r.status_code == 201
        r2 = client.post("/auth/login", json={"email": email, "password": "Valid@Pass1"})
        assert r2.status_code == 200

    def test_duplicate_email_is_409(self, client):
        r = client.post("/auth/register", json={
            "name": "Dup", "email": CANDIDATE[0], "password": "Valid@Pass1", "role": "CANDIDATE",
        })
        assert r.status_code == 409

    def test_me_requires_token(self, client):
        assert client.get("/users/me").status_code == 401

    def test_me_rejects_garbage_token(self, client):
        assert client.get("/users/me", headers=auth("not.a.jwt")).status_code == 401

    def test_me_returns_profile(self, client, candidate_token):
        r = client.get("/users/me", headers=auth(candidate_token))
        assert r.status_code == 200
        assert r.json()["email"] == CANDIDATE[0]


class TestRBAC:
    def test_admin_only_user_list_blocks_candidate(self, client, candidate_token):
        assert client.get("/users", headers=auth(candidate_token)).status_code == 403

    def test_admin_only_user_list_blocks_recruiter(self, client, recruiter_token):
        assert client.get("/users", headers=auth(recruiter_token)).status_code == 403

    def test_admin_can_list_users(self, client, admin_token):
        r = client.get("/users", headers=auth(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_role_escalation_via_profile_update_is_ignored(self, client, candidate_token):
        """UserUpdate has no role field, so sending one must not escalate."""
        r = client.put("/users/me", headers=auth(candidate_token), json={"role": "ADMIN"})
        assert r.status_code in (200, 400, 422)
        me = client.get("/users/me", headers=auth(candidate_token))
        assert me.json()["role"] == "CANDIDATE", "PRIVILEGE ESCALATION: role changed via /users/me"

    def test_only_admin_can_change_roles(self, client, candidate_token, recruiter_token):
        for token in (candidate_token, recruiter_token):
            r = client.put("/users/4/role", headers=auth(token), json={"role": "ADMIN"})
            assert r.status_code == 403
