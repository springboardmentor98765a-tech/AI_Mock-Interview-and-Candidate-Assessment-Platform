from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from database import get_db
from models import UpdateUserAdminRequest, UserResponse
from auth import require_role

router = APIRouter(prefix="/api/users", tags=["users"])


def row_to_user(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "provider": row["provider"],
        "google_id": row["google_id"],
        "avatar": row["avatar"],
        "created_at": str(row["created_at"]) if row["created_at"] else None,
        "updated_at": str(row["updated_at"]) if row["updated_at"] else None,
    }


@router.get("")
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(require_role("admin")),
):
    conn = get_db()
    where = []
    params = []

    if role:
        where.append("role = ?")
        params.append(role)
    if search:
        where.append("(name LIKE ? OR email LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])

    where_clause = f"WHERE {' AND '.join(where)}" if where else ""
    offset = (page - 1) * limit

    rows = conn.execute(
        f"SELECT id, name, email, role, provider, avatar, created_at, updated_at FROM users {where_clause} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        params + [limit, offset],
    ).fetchall()

    count = conn.execute(f"SELECT COUNT(*) as total FROM users {where_clause}", params).fetchone()["total"]
    conn.close()

    return {"users": [row_to_user(r) for r in rows], "total": count, "page": page, "limit": limit}


@router.get("/stats")
def user_stats(user: dict = Depends(require_role("admin"))):
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    by_role = conn.execute("SELECT role, COUNT(*) as count FROM users GROUP BY role").fetchall()
    conn.close()
    return {"total": total, "by_role": [{"role": r["role"], "count": r["count"]} for r in by_role]}


@router.get("/{user_id}")
def get_user(user_id: int, user: dict = Depends(require_role("admin"))):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "User not found.")
    return {"user": row_to_user(row)}


@router.put("/{user_id}")
def update_user(user_id: int, req: UpdateUserAdminRequest, user: dict = Depends(require_role("admin"))):
    conn = get_db()
    row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "User not found.")

    updates = []
    values = []
    if req.name:
        updates.append("name = ?")
        values.append(req.name)
    if req.email:
        updates.append("email = ?")
        values.append(req.email)
    if req.role:
        if req.role not in ("candidate", "recruiter", "admin"):
            conn.close()
            raise HTTPException(400, "Invalid role.")
        updates.append("role = ?")
        values.append(req.role)

    if updates:
        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(user_id)
        conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()

    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return {"message": "User updated.", "user": row_to_user(row)}


@router.delete("/{user_id}")
def delete_user(user_id: int, user: dict = Depends(require_role("admin"))):
    if user_id == user["id"]:
        raise HTTPException(400, "Cannot delete your own account.")
    conn = get_db()
    row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "User not found.")
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "User deleted."}
