from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.setting import get_settings
from app.models.user import Provider, Role, User
from app.schemas.user import (
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Nobody may make themselves an administrator through the public form.
SELF_SERVICE_ROLES = {Role.CANDIDATE, Role.RECRUITER}


def _issue_token(user: User) -> TokenResponse:
    token = create_access_token(user_id=user.id, email=user.email, role=user.role.value)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Validate input, reject duplicate emails, hash the password, save the user."""
    if payload.role not in SELF_SERVICE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot register with that role.",
        )

    # Administrators can close public signup; the setting is enforced, not
    # decorative.
    if not get_settings(db).open_signup:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration is currently closed.",
        )

    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists.",
        )

    user = User(
        name=payload.name.strip(),
        email=email,
        password=hash_password(payload.password),
        role=payload.role,
        provider=Provider.LOCAL,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return MessageResponse(message="Registration successful.", user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Verify credentials and return a signed JWT."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    # Same message either way, so the response cannot be used to discover emails.
    if user is None or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been blocked by an administrator.",
        )

    return _issue_token(user)


# ---------------------------------------------------------------- Google OAuth2

def _oauth():
    """Built lazily so the app still starts without Google credentials."""
    from authlib.integrations.starlette_client import OAuth

    oauth = OAuth()
    oauth.register(
        name="google",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
    return oauth


@router.get("/google/login")
async def google_login(request: Request):
    """Step 1: bounce the browser to Google's consent screen."""
    if not settings.google_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login is not configured on this server.",
        )
    google = _oauth().create_client("google")
    return await google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """
    Step 2: exchange the authorization code for a profile, create the account on
    first login, then hand back the same JWT the local login issues.
    """
    if not settings.google_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login is not configured on this server.",
        )

    google = _oauth().create_client("google")
    try:
        token = await google.authorize_access_token(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google sign-in failed. Please try again.",
        )

    profile = token.get("userinfo") or {}
    email = (profile.get("email") or "").lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google did not return an email address.",
        )

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            name=profile.get("name") or email.split("@")[0],
            email=email,
            password=None,  # Google accounts have no local password
            role=Role.CANDIDATE,
            provider=Provider.GOOGLE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token(user_id=user.id, email=user.email, role=user.role.value)

    # Hand the token to the SPA. A short-lived code exchanged over POST would be
    # tighter than a query string; this keeps the teaching flow readable.
    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/login?token={jwt_token}&role={user.role.value}"
    )


# ---------------------------------------------------------------- GitHub OAuth2

def _github_oauth():
    """
    Built lazily so the app still starts without GitHub credentials.

    GitHub has no OIDC discovery document like Google, so the endpoints are
    registered explicitly and the profile/email are fetched from GitHub's REST
    API after the token exchange rather than read off the token itself.
    """
    from authlib.integrations.starlette_client import OAuth

    oauth = OAuth()
    oauth.register(
        name="github",
        client_id=settings.GITHUB_CLIENT_ID,
        client_secret=settings.GITHUB_CLIENT_SECRET,
        authorize_url="https://github.com/login/oauth/authorize",
        access_token_url="https://github.com/login/oauth/access_token",
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "read:user user:email"},
    )
    return oauth


@router.get("/github/login")
async def github_login(request: Request):
    """Step 1: bounce the browser to GitHub's consent screen."""
    if not settings.github_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub login is not configured on this server.",
        )
    github = _github_oauth().create_client("github")
    return await github.authorize_redirect(request, settings.GITHUB_REDIRECT_URI)


@router.get("/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    """
    Step 2: exchange the authorization code for an access token, fetch the
    profile and verified email from GitHub's API, create the account on first
    login, then hand back the same JWT the local login issues.
    """
    if not settings.github_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub login is not configured on this server.",
        )

    github = _github_oauth().create_client("github")
    try:
        token = await github.authorize_access_token(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub sign-in failed. Please try again.",
        )

    try:
        profile_resp = await github.get("user", token=token)
        profile_resp.raise_for_status()
        profile = profile_resp.json()

        emails_resp = await github.get("user/emails", token=token)
        emails_resp.raise_for_status()
        emails = emails_resp.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read your GitHub profile. Please try again.",
        )

    # A GitHub account's primary address may be hidden from /user, so the
    # verified address is looked up separately via /user/emails.
    verified = [e for e in emails if e.get("verified")]
    primary = next((e for e in verified if e.get("primary")), None)
    chosen = primary or (verified[0] if verified else None)

    if chosen is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub did not return a verified email address.",
        )

    email = chosen["email"].lower()

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            name=profile.get("name") or profile.get("login") or email.split("@")[0],
            email=email,
            password=None,  # GitHub accounts have no local password
            role=Role.CANDIDATE,
            provider=Provider.GITHUB,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token(user_id=user.id, email=user.email, role=user.role.value)

    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/login?token={jwt_token}&role={user.role.value}"
    )
