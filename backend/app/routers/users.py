# ============================================================
#  routers/users.py — /api/users endpoints
# ============================================================
from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.dependencies import AdminOnly, CurrentUser
from app.schemas import MessageResponse, UpdateUserRequest, UserResponse
from app.security import hash_password

if TYPE_CHECKING:
    import asyncpg

router = APIRouter(prefix="/api/users", tags=["Users"])


def _row_to_user(row) -> UserResponse:
    return UserResponse(**dict(row))


# ──────────────────────────────────────────────
#  GET /api/users  (Admin only)
# ──────────────────────────────────────────────
@router.get("/", response_model=list[UserResponse])
async def list_users(
    _admin: AdminOnly,
    db=Depends(get_db),
):
    rows = await db.fetch(
        "SELECT id, name, email, role, auth_provider, avatar_url, is_active, last_login_at, created_at "
        "FROM users ORDER BY created_at DESC"
    )
    return [_row_to_user(r) for r in rows]


# ──────────────────────────────────────────────
#  PUT /api/users/:id  (Self or Admin)
# ──────────────────────────────────────────────
@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: UpdateUserRequest,
    current_user: CurrentUser,
    db=Depends(get_db),
):
    # Only self or admin may update
    if str(current_user["id"]) != str(user_id) and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only edit your own profile.",
        )

    # Build SET clause dynamically
    sets: list[str] = []
    vals: list = []
    idx = 1

    if body.name is not None:
        sets.append(f"name = ${idx}")
        vals.append(body.name.strip())
        idx += 1
    if body.email is not None:
        sets.append(f"email = ${idx}")
        vals.append(body.email.lower())
        idx += 1
    if body.password is not None:
        sets.append(f"password_hash = ${idx}")
        vals.append(hash_password(body.password))
        idx += 1
    # BUG FIX 1: role guard was checking after idx was already incremented.
    # Moved the role check before appending so idx stays correct.
    if body.role is not None and current_user["role"] == "admin":
        sets.append(f"role = ${idx}")
        vals.append(body.role.value)
        idx += 1

    if not sets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )

    # BUG FIX 2: Pass UUID object directly (not str) — asyncpg maps it natively.
    vals.append(user_id)
    try:
        row = await db.fetchrow(
            f"UPDATE users SET {', '.join(sets)} WHERE id = ${idx} "
            f"RETURNING id, name, email, role, auth_provider, avatar_url, is_active, last_login_at, created_at",
            *vals,
        )
    except Exception as exc:
        # Catch unique email violation
        if "unique" in str(exc).lower() or "duplicate" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Update failed.",
        )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return _row_to_user(row)


# ──────────────────────────────────────────────
#  DELETE /api/users/:id  (Admin only)
# ──────────────────────────────────────────────
@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: UUID,
    admin: AdminOnly,
    db=Depends(get_db),
):
    if str(admin["id"]) == str(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    # BUG FIX 3: Pass UUID object directly — str(user_id) can fail UUID
    # matching if asyncpg expects native UUID type for the column.
    row = await db.fetchrow(
        "DELETE FROM users WHERE id = $1 RETURNING name",
        user_id,
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return MessageResponse(
        success=True,
        message=f'User "{row["name"]}" deleted successfully.',
    )
