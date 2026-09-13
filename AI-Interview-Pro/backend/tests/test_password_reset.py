from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import create_access_token, get_current_user
from app.database import Base
from app.models import AuthProviderEnum, PasswordResetCode, RoleEnum, User
from app.routes import auth_routes
from app.schemas import (
    PasswordResetCompleteRequest,
    PasswordResetRequest,
    PasswordResetVerifyRequest,
)
from app.utils import hash_password, verify_password


@pytest.fixture()
def reset_db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def local_user(reset_db):
    account = User(
        full_name="Reset Candidate",
        email="reset@example.com",
        password_hash=hash_password("Oldpass1"),
        role=RoleEnum.candidate,
        auth_provider=AuthProviderEnum.local,
        is_active=True,
    )
    reset_db.add(account)
    reset_db.commit()
    reset_db.refresh(account)
    return account


def test_password_reset_happy_path_and_revokes_old_sessions(reset_db, local_user, monkeypatch):
    sent = {}
    monkeypatch.setattr(auth_routes, "smtp_ready", lambda: True)
    monkeypatch.setattr(
        auth_routes, "send_password_reset_email", lambda recipient, code: sent.update(email=recipient, code=code)
    )
    old_token = create_access_token(
        {"sub": str(local_user.id), "role": "candidate", "auth_version": 0}
    )

    response = auth_routes.request_password_reset(
        PasswordResetRequest(email=local_user.email), reset_db
    )
    assert "verification code" in response.message
    assert sent["email"] == local_user.email
    assert len(sent["code"]) == 6 and sent["code"].isdigit()

    verified = auth_routes.verify_password_reset(
        PasswordResetVerifyRequest(email=local_user.email, code=sent["code"]), reset_db
    )
    auth_routes.complete_password_reset(
        PasswordResetCompleteRequest(
            email=local_user.email,
            reset_token=verified.reset_token,
            password="Newpass2",
            confirm_password="Newpass2",
        ),
        reset_db,
    )

    reset_db.refresh(local_user)
    assert verify_password("Newpass2", local_user.password_hash)
    assert not verify_password("Oldpass1", local_user.password_hash)
    assert local_user.auth_version == 1
    assert reset_db.query(PasswordResetCode).one().used_at is not None

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=old_token)
    with pytest.raises(HTTPException) as invalid_session:
        get_current_user(credentials, reset_db)
    assert invalid_session.value.status_code == 401


def test_unknown_email_uses_generic_response_without_sending(reset_db, monkeypatch):
    calls = []
    monkeypatch.setattr(auth_routes, "smtp_ready", lambda: True)
    monkeypatch.setattr(auth_routes, "send_password_reset_email", lambda *args: calls.append(args))
    result = auth_routes.request_password_reset(
        PasswordResetRequest(email="missing@example.com"), reset_db
    )
    assert "If an active password account exists" in result.message
    assert calls == []


def test_reset_code_is_rate_limited_and_locks_after_five_attempts(reset_db, local_user, monkeypatch):
    sent = []
    monkeypatch.setattr(auth_routes, "smtp_ready", lambda: True)
    monkeypatch.setattr(auth_routes, "send_password_reset_email", lambda email, code: sent.append(code))
    payload = PasswordResetRequest(email=local_user.email)
    auth_routes.request_password_reset(payload, reset_db)
    auth_routes.request_password_reset(payload, reset_db)
    assert len(sent) == 1

    for _ in range(5):
        with pytest.raises(HTTPException):
            auth_routes.verify_password_reset(
                PasswordResetVerifyRequest(email=local_user.email, code="999999"), reset_db
            )
    challenge = reset_db.query(PasswordResetCode).one()
    assert challenge.attempts == 5
    assert challenge.used_at is not None


def test_expired_code_cannot_be_verified(reset_db, local_user):
    challenge = PasswordResetCode(
        user_id=local_user.id,
        code_hash=auth_routes._reset_digest(local_user.id, "123456"),
        expires_at=datetime.utcnow() - timedelta(seconds=1),
    )
    reset_db.add(challenge)
    reset_db.commit()
    with pytest.raises(HTTPException) as expired:
        auth_routes.verify_password_reset(
            PasswordResetVerifyRequest(email=local_user.email, code="123456"), reset_db
        )
    assert expired.value.status_code == 400

