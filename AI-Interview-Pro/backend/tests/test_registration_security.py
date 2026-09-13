from app.models import AuthProviderEnum, RoleEnum, User
from app.routes.auth_routes import google_select_role, login, register
from app.routes.module8_routes import list_recruiters
from app.schemas import GoogleRoleUpdateRequest, LoginRequest, RegisterRequest
from app.utils import hash_password
from test_module8_consent import db


def registration(email, role):
    return RegisterRequest(
        full_name="New Account",
        email=email,
        password="Secure123",
        confirm_password="Secure123",
        role=role,
    )


def test_all_mentor_required_roles_register_and_login_immediately(db):
    for role in ("candidate", "recruiter", "admin"):
        email = f"new-{role}@example.com"
        result = register(registration(email, role), db)
        assert result.access_token
        assert result.user.role == role
        assert login(LoginRequest(email=email, password="Secure123"), db).access_token


def test_active_recruiter_is_immediately_visible_to_candidates(db):
    recruiter_result = register(
        registration("available-recruiter@example.com", "recruiter"), db
    )
    candidate = User(
        full_name="Candidate",
        email="recruiter-list-candidate@example.com",
        password_hash=hash_password("Candidate123"),
        role=RoleEnum.candidate,
        auth_provider=AuthProviderEnum.local,
        is_active=True,
    )
    db.add(candidate)
    db.commit()

    visible_ids = {row.id for row in list_recruiters(candidate, db)}
    assert recruiter_result.user.id in visible_ids


def test_google_role_selection_supports_recruiter_and_admin(db):
    for role in ("recruiter", "admin"):
        google_user = User(
            full_name=f"Google {role.title()}",
            email=f"google-{role}@example.com",
            role=None,
            password_hash=None,
            auth_provider=AuthProviderEnum.google,
            google_id=f"google-{role}-id",
            is_active=True,
        )
        db.add(google_user)
        db.commit()

        result = google_select_role(GoogleRoleUpdateRequest(role=role), google_user, db)
        assert result.access_token
        assert result.user.role == role
