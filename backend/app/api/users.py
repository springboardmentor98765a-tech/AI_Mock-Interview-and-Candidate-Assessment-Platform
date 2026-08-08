from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.ticket import DirectoryEntry
from app.schemas.user import RoleUpdate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


class BlockUpdate(BaseModel):
    is_blocked: bool


@router.get("/me", response_model=UserOut)
def read_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update your own profile. UserUpdate has no role field, so a client cannot
    escalate its own privileges here even by sending one.
    """
    if payload.name is not None:
        current_user.name = payload.name.strip()

    if payload.password is not None:
        current_user.password = hash_password(payload.password)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/directory", response_model=List[DirectoryEntry])
def directory(
    role: Role = Query(..., description="Which role to list."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Names and ids only, for choosing who to report.

    Deliberately minimal — no email, no status — because any signed-in user can
    call this. Listing administrators is not offered.
    """
    if role == Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Administrators are not listed."
        )

    users = (
        db.query(User)
        .filter(User.id != current_user.id, User.role == role, User.is_blocked.is_(False))
        .order_by(User.name)
        .all()
    )
    return [DirectoryEntry(id=u.id, name=u.name, role=u.role.value) for u in users]


@router.get("", response_model=List[UserOut], dependencies=[Depends(require_roles(Role.ADMIN))])
def list_users(db: Session = Depends(get_db)):
    """Admin only. Any other role gets 403 from require_roles."""
    return db.query(User).order_by(User.id).all()


@router.put(
    "/{user_id}/block",
    response_model=UserOut,
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
def set_blocked(
    user_id: int,
    payload: BlockUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Block or unblock a user.

    Blocking is enforced, not cosmetic: the user can no longer log in, and
    `get_current_user` rejects their existing token on the next request.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot block yourself."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.is_blocked = payload.is_blocked
    db.commit()
    db.refresh(user)
    return user


@router.put(
    "/{user_id}/role",
    response_model=UserOut,
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
def change_role(user_id: int, payload: RoleUpdate, db: Session = Depends(get_db)):
    """The only endpoint that can change a role, and it is administrators only."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user
