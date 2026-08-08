from typing import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import Role, User

bearer_scheme = HTTPBearer(auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the Authorization: Bearer <token> header into a User row."""
    if credentials is None:
        raise CREDENTIALS_ERROR

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise CREDENTIALS_ERROR

    user_id = payload.get("id")
    if user_id is None:
        raise CREDENTIALS_ERROR

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise CREDENTIALS_ERROR

    # Blocking takes effect immediately, on the token the user already holds —
    # otherwise a blocked account stays usable for the rest of the JWT's life.
    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been blocked by an administrator.",
        )

    return user


def require_roles(*allowed: Role):
    """
    Dependency factory for role-based access control.

    Usage:  dependencies=[Depends(require_roles(Role.ADMIN))]
    Returns 403 when the caller is authenticated but lacks the role.
    """
    allowed_roles: Iterable[Role] = allowed

    def _guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return current_user

    return _guard
