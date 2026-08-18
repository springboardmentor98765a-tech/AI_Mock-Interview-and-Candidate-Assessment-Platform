import uuid
import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from backend.database import db
from backend.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "candidate" # candidate, recruiter, admin
    company: str = ""

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
def register_user(req: RegisterRequest):
    # Check existing email
    for user in db.users.values():
        if user["email"].lower() == req.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account with this email address already exists."
            )
    
    if req.role not in ["candidate", "recruiter", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified. Must be candidate, recruiter, or admin."
        )

    user_id = f"user_{req.role}_{uuid.uuid4().hex[:6]}"
    new_user = {
        "id": user_id,
        "email": req.email.lower(),
        "full_name": req.full_name,
        "password_hash": hash_password(req.password),
        "role": req.role,
        "company": req.company if req.role == "recruiter" else "",
        "status": "Active",
        "created_at": datetime.datetime.now().isoformat()
    }
    
    db.users[user_id] = new_user
    token = create_access_token(user_id, new_user["email"], new_user["role"])

    return {
        "message": "User registered successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user["id"],
            "email": new_user["email"],
            "full_name": new_user["full_name"],
            "role": new_user["role"],
            "company": new_user.get("company", "")
        }
    }

@router.post("/login")
def login_user(req: LoginRequest):
    matched_user = None
    for u in db.users.values():
        if u["email"].lower() == req.email.lower():
            matched_user = u
            break
            
    if not matched_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email credentials."
        )
        
    if not verify_password(req.password, matched_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password credentials."
        )

    token = create_access_token(matched_user["id"], matched_user["email"], matched_user["role"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": matched_user["id"],
            "email": matched_user["email"],
            "full_name": matched_user["full_name"],
            "role": matched_user["role"],
            "company": matched_user.get("company", "")
        }
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "company": current_user.get("company", ""),
        "status": current_user.get("status", "Active")
    }
