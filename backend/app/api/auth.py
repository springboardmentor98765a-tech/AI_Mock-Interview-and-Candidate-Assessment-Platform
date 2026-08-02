from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
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
