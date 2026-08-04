# ============================================================
#  routers/oauth.py — Google & GitHub OAuth endpoints
# ============================================================
from datetime import datetime, timezone
from urllib.parse import urlencode

import asyncpg
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse

from app.config import settings
from app.database import get_db
from app.security import create_access_token

router = APIRouter(prefix="/api/auth", tags=["OAuth"])

COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _set_auth_cookie(response: RedirectResponse, token: str):
    response.set_cookie(
        key="smarthire_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


async def _upsert_oauth_user(
    db: asyncpg.Connection,
    *,
    email: str,
    name: str,
    avatar_url: str | None,
    provider: str,
) -> dict:
    """Find existing user by email or create a new OAuth user."""
    user = await db.fetchrow(
        "SELECT id, name, email, role, auth_provider, avatar_url, is_active, last_login_at, created_at "
        "FROM users WHERE email = $1",
        email.lower(),
    )

    if user:
        # Update last_login_at and avatar if changed
        await db.execute(
            "UPDATE users SET last_login_at = $1, avatar_url = COALESCE($2, avatar_url) WHERE id = $3",
            datetime.now(timezone.utc),
            avatar_url,
            user["id"],
        )
        return dict(user)

    # Create new user — default role is 'candidate'
    new_user = await db.fetchrow(
        """
        INSERT INTO users (name, email, password_hash, role, auth_provider, avatar_url)
        VALUES ($1, $2, NULL, 'candidate'::user_role, $3::auth_provider, $4)
        RETURNING id, name, email, role, auth_provider, avatar_url, is_active, last_login_at, created_at
        """,
        name,
        email.lower(),
        provider,
        avatar_url,
    )
    return dict(new_user)


# ═══════════════════════════════════════════════
#  GOOGLE OAUTH
# ═══════════════════════════════════════════════

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google", tags=["OAuth"])
async def google_login():
    """Redirect the user to Google's consent screen."""
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"http://localhost:5000/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback", tags=["OAuth"])
async def google_callback(code: str = "", error: str = "", db: asyncpg.Connection = Depends(get_db)):
    """Handle Google's OAuth callback."""
    frontend_url = settings.FRONTEND_URL

    if error or not code:
        return RedirectResponse(f"{frontend_url}/?oauth=error&provider=google")

    try:
        # Exchange authorization code for access token
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": "http://localhost:5000/api/auth/google/callback",
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
            )
            token_data = token_res.json()

            if "access_token" not in token_data:
                return RedirectResponse(f"{frontend_url}/?oauth=error&provider=google")

            # Fetch user profile
            profile_res = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            profile = profile_res.json()

        email = profile.get("email")
        name = profile.get("name", email.split("@")[0])
        avatar_url = profile.get("picture")

        if not email:
            return RedirectResponse(f"{frontend_url}/?oauth=error&provider=google")

        # Upsert user in database
        user = await _upsert_oauth_user(db, email=email, name=name, avatar_url=avatar_url, provider="google")

        if not user.get("is_active", True):
            return RedirectResponse(f"{frontend_url}/?oauth=error&reason=deactivated")

        # Create JWT and set cookie
        token = create_access_token({
            "id": str(user["id"]),
            "email": user["email"],
            "role": user["role"],
            "name": user["name"],
        })

        response = RedirectResponse(f"{frontend_url}/?oauth=success", status_code=302)
        _set_auth_cookie(response, token)
        return response

    except Exception as exc:
        print(f"[OAuth] Google callback error: {exc}")
        return RedirectResponse(f"{frontend_url}/?oauth=error&provider=google")


# ═══════════════════════════════════════════════
#  GITHUB OAUTH
# ═══════════════════════════════════════════════

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


@router.get("/github", tags=["OAuth"])
async def github_login():
    """Redirect the user to GitHub's consent screen."""
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": "http://localhost:5000/api/auth/github/callback",
        "scope": "read:user user:email",
    }
    return RedirectResponse(f"{GITHUB_AUTH_URL}?{urlencode(params)}")


@router.get("/github/callback", tags=["OAuth"])
async def github_callback(code: str = "", error: str = "", db: asyncpg.Connection = Depends(get_db)):
    """Handle GitHub's OAuth callback."""
    frontend_url = settings.FRONTEND_URL

    if error or not code:
        return RedirectResponse(f"{frontend_url}/?oauth=error&provider=github")

    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            token_res = await client.post(
                GITHUB_TOKEN_URL,
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": "http://localhost:5000/api/auth/github/callback",
                },
                headers={"Accept": "application/json"},
            )
            token_data = token_res.json()

            access_token = token_data.get("access_token")
            if not access_token:
                return RedirectResponse(f"{frontend_url}/?oauth=error&provider=github")

            auth_headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            }

            # Fetch user profile
            profile_res = await client.get(GITHUB_USER_URL, headers=auth_headers)
            profile = profile_res.json()

            # GitHub may not include email in profile — fetch from /user/emails
            email = profile.get("email")
            if not email:
                emails_res = await client.get(GITHUB_EMAILS_URL, headers=auth_headers)
                emails = emails_res.json()
                # Pick the primary verified email
                for e in emails:
                    if e.get("primary") and e.get("verified"):
                        email = e["email"]
                        break
                # Fallback: first verified email
                if not email:
                    for e in emails:
                        if e.get("verified"):
                            email = e["email"]
                            break

            if not email:
                return RedirectResponse(f"{frontend_url}/?oauth=error&provider=github&reason=no_email")

        name = profile.get("name") or profile.get("login", email.split("@")[0])
        avatar_url = profile.get("avatar_url")

        # Upsert user in database
        user = await _upsert_oauth_user(db, email=email, name=name, avatar_url=avatar_url, provider="github")

        if not user.get("is_active", True):
            return RedirectResponse(f"{frontend_url}/?oauth=error&reason=deactivated")

        # Create JWT and set cookie
        token = create_access_token({
            "id": str(user["id"]),
            "email": user["email"],
            "role": user["role"],
            "name": user["name"],
        })

        response = RedirectResponse(f"{frontend_url}/?oauth=success", status_code=302)
        _set_auth_cookie(response, token)
        return response

    except Exception as exc:
        print(f"[OAuth] GitHub callback error: {exc}")
        return RedirectResponse(f"{frontend_url}/?oauth=error&provider=github")
