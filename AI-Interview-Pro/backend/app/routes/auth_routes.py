"""
routes/auth_routes.py
=======================
All authentication-related endpoints:
    POST /register
    POST /login
    GET  /me
    POST /logout
    GET  /verify-token
    GET  /auth/google
    GET  /auth/google/callback
"""

from urllib.parse import urlencode
import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, RoleEnum, AuthProviderEnum, PasswordResetCode
from app.schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserOut,
    MessageResponse,
    GoogleRoleUpdateRequest,
    PasswordResetRequest,
    PasswordResetVerifyRequest,
    PasswordResetCompleteRequest,
    PasswordResetVerifyResponse,
)
from app.utils import hash_password, verify_password
from app.auth import create_access_token, get_current_user
from app.oauth import oauth
from app.config import settings
from app.notification_service import smtp_ready, send_password_reset_email

router = APIRouter(tags=["Authentication"])
log = logging.getLogger(__name__)

RESET_CODE_MINUTES = 10
RESET_RESEND_SECONDS = 60
RESET_MAX_ATTEMPTS = 5
RESET_MAX_REQUESTS_PER_HOUR = 5


def _reset_digest(user_id, secret_value):
    value = f"{user_id}:{secret_value}".encode("utf-8")
    return hmac.new(settings.SESSION_SECRET_KEY.encode("utf-8"), value, hashlib.sha256).hexdigest()


def _generic_reset_message():
    return MessageResponse(
        message="If an active password account exists for that email, a verification code has been sent."
    )


# ---------------------------------------------------------------------------
# POST /register
# ---------------------------------------------------------------------------
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Check for duplicate email
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    new_user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=RoleEnum(payload.role),
        auth_provider=AuthProviderEnum.local,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(
        {"sub": str(new_user.id), "role": new_user.role.value, "auth_version": 0}
    )
    return TokenResponse(
        access_token=token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(new_user),
    )


# ---------------------------------------------------------------------------
# POST /login
# ---------------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    # Unregistered email
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email.",
        )

    # Account was created via Google -> no local password to check
    if user.auth_provider == AuthProviderEnum.google or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google Sign-In. Please continue with Google.",
        )

    # Wrong password
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated."
        )
    token = create_access_token({"sub": str(user.id), "role": user.role.value, "auth_version": user.auth_version or 0})

    return TokenResponse(
        access_token=token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Password recovery: request code -> verify code -> set a new password
# ---------------------------------------------------------------------------
@router.post("/password-reset/request", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    if not smtp_ready():
        raise HTTPException(status_code=503, detail="Email delivery is not configured. Contact the administrator.")

    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()
    # A generic response prevents account discovery. Google-only and disabled
    # accounts intentionally receive no local-password reset email.
    if not user or not user.is_active or user.auth_provider != AuthProviderEnum.local or not user.password_hash:
        return _generic_reset_message()

    now = datetime.utcnow()
    recent = db.query(PasswordResetCode).filter(
        PasswordResetCode.user_id == user.id,
        PasswordResetCode.created_at >= now - timedelta(seconds=RESET_RESEND_SECONDS),
    ).first()
    hourly_count = db.query(PasswordResetCode).filter(
        PasswordResetCode.user_id == user.id,
        PasswordResetCode.created_at >= now - timedelta(hours=1),
    ).count()
    if recent or hourly_count >= RESET_MAX_REQUESTS_PER_HOUR:
        return _generic_reset_message()

    db.query(PasswordResetCode).filter(
        PasswordResetCode.user_id == user.id,
        PasswordResetCode.used_at.is_(None),
    ).update({PasswordResetCode.used_at: now}, synchronize_session=False)

    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge = PasswordResetCode(
        user_id=user.id,
        code_hash=_reset_digest(user.id, code),
        expires_at=now + timedelta(minutes=RESET_CODE_MINUTES),
    )
    db.add(challenge)
    db.commit()
    try:
        send_password_reset_email(user.email, code)
    except Exception:
        log.exception("Password reset email delivery failed")
        challenge.used_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=503, detail="The verification email could not be sent. Please try again later.")
    return _generic_reset_message()


@router.post("/password-reset/verify", response_model=PasswordResetVerifyResponse)
def verify_password_reset(payload: PasswordResetVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    now = datetime.utcnow()
    challenge = db.query(PasswordResetCode).filter(
        PasswordResetCode.user_id == user.id,
        PasswordResetCode.used_at.is_(None),
        PasswordResetCode.expires_at > now,
    ).order_by(PasswordResetCode.created_at.desc()).first()
    if not challenge or challenge.attempts >= RESET_MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    if not hmac.compare_digest(challenge.code_hash, _reset_digest(user.id, payload.code)):
        challenge.attempts += 1
        if challenge.attempts >= RESET_MAX_ATTEMPTS:
            challenge.used_at = now
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    reset_token = secrets.token_urlsafe(32)
    challenge.reset_token_hash = _reset_digest(user.id, reset_token)
    challenge.verified_at = now
    db.commit()
    return PasswordResetVerifyResponse(reset_token=reset_token)


@router.post("/password-reset/complete", response_model=MessageResponse)
def complete_password_reset(payload: PasswordResetCompleteRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or user.auth_provider != AuthProviderEnum.local:
        raise HTTPException(status_code=400, detail="The reset session is invalid or expired.")

    now = datetime.utcnow()
    challenge = db.query(PasswordResetCode).filter(
        PasswordResetCode.user_id == user.id,
        PasswordResetCode.used_at.is_(None),
        PasswordResetCode.verified_at.isnot(None),
        PasswordResetCode.expires_at > now,
    ).order_by(PasswordResetCode.created_at.desc()).first()
    if not challenge or not challenge.reset_token_hash or not hmac.compare_digest(
        challenge.reset_token_hash, _reset_digest(user.id, payload.reset_token)
    ):
        raise HTTPException(status_code=400, detail="The reset session is invalid or expired.")

    user.password_hash = hash_password(payload.password)
    user.auth_version = int(user.auth_version or 0) + 1
    challenge.used_at = now
    db.query(PasswordResetCode).filter(
        PasswordResetCode.user_id == user.id,
        PasswordResetCode.id != challenge.id,
        PasswordResetCode.used_at.is_(None),
    ).update({PasswordResetCode.used_at: now}, synchronize_session=False)
    db.commit()
    return MessageResponse(message="Password updated successfully. Log in with your new password.")


# ---------------------------------------------------------------------------
# GET /me  (protected)
# ---------------------------------------------------------------------------
@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


# ---------------------------------------------------------------------------
# POST /logout
# ---------------------------------------------------------------------------
@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    # JWTs are stateless, so "logout" is enforced client-side by discarding
    # the token. This endpoint exists so the frontend has a clear call to
    # make, and it also confirms the token was valid before it is discarded.
    return MessageResponse(message="Logged out successfully.")


# ---------------------------------------------------------------------------
# GET /verify-token  (protected)
# ---------------------------------------------------------------------------
@router.get("/verify-token", response_model=UserOut)
def verify_token(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


# ---------------------------------------------------------------------------
# POST /auth/google/select-role
# ---------------------------------------------------------------------------
@router.post("/auth/google/select-role", response_model=TokenResponse)
def google_select_role(
    payload: GoogleRoleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.role = RoleEnum(payload.role)

    db.commit()
    db.refresh(current_user)

    token = create_access_token(
        {
            "sub": str(current_user.id),
            "role": current_user.role.value,
            "auth_version": current_user.auth_version or 0,
        }
    )

    return TokenResponse(
        access_token=token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(current_user),
    )
# ---------------------------------------------------------------------------
# GET /auth/google  -> redirect to Google's consent screen
# ---------------------------------------------------------------------------
@router.get("/auth/google")
async def google_login(request: Request):
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)


# ---------------------------------------------------------------------------
# GET /auth/google/callback  -> Google redirects back here
# ---------------------------------------------------------------------------
@router.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        error_params = urlencode({"auth_error": "google_auth_failed"})
        return RedirectResponse(f"{settings.FRONTEND_URL}/index.html?{error_params}")

    userinfo = token.get("userinfo")
    if not userinfo:
        userinfo = await oauth.google.userinfo(token=token)

    google_id = userinfo.get("sub")
    email = (userinfo.get("email") or "").lower()
    full_name = userinfo.get("name") or email.split("@")[0]
    profile_picture = userinfo.get("picture")

    if not email or not google_id:
        error_params = urlencode({"auth_error": "google_missing_profile"})
        return RedirectResponse(f"{settings.FRONTEND_URL}/index.html?{error_params}")

    # Look up by google_id first, then by email (linking an existing local account)
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()

    if user:
        # Existing user -> log them in, keep their existing role
        if not user.google_id:
            user.google_id = google_id
            user.auth_provider = AuthProviderEnum.google
        if profile_picture:
            user.profile_picture = profile_picture
        db.commit()
        db.refresh(user)
    else:
        # New user -> create account.
        # Google doesn't tell us the intended role, so new Google sign-ups
        # are created with no role yet. The frontend prompts them to pick
        # one (Candidate / Recruiter / Admin) via /auth/google/select-role
        # before they can reach any dashboard.
        user = User(
            full_name=full_name,
            email=email,
            password_hash=None,
            role=None,
            auth_provider=AuthProviderEnum.google,
            google_id=google_id,
            profile_picture=profile_picture,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        error_params = urlencode({"auth_error": "account_disabled"})
        return RedirectResponse(f"{settings.FRONTEND_URL}/index.html?{error_params}")
    jwt_token = create_access_token(
        {"sub": str(user.id), "role": user.role.value if user.role else None, "auth_version": user.auth_version or 0}
    )

    # Redirect back to the frontend landing page with the token in the
    # query string. The frontend JS reads it, stores it, and forwards
    # the user to the correct dashboard.
    # NOTE: "role" is only included when the account already has one.
    # A missing "role" param tells the frontend this is a new sign-up
    # that still needs to go through the role-selection step.
    params = {
        "token": jwt_token,
        "name": user.full_name,
    }
    if user.role:
        params["role"] = user.role.value

    return RedirectResponse(f"{settings.FRONTEND_URL}/index.html?{urlencode(params)}")
