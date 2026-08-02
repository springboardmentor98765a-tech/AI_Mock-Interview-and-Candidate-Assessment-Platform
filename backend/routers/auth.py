from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.auth import (
    CandidateRegisterRequest,
    RecruiterRegisterRequest,
    LoginRequest,
    GoogleAuthRequest,
    GoogleRoleCompleteRequest,
    TokenResponse
)
from schemas.user import UserResponse
from services.auth_service import (
    register_candidate_service,
    register_recruiter_service,
    login_user_service,
    google_auth_service,
    complete_google_role_service
)
from security.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register/candidate", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_candidate(data: CandidateRegisterRequest, db: Session = Depends(get_db)):
    return register_candidate_service(data, db)

@router.post("/register/recruiter", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_recruiter(data: RecruiterRegisterRequest, db: Session = Depends(get_db)):
    return register_recruiter_service(data, db)

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return login_user_service(data, db)

@router.post("/google", response_model=TokenResponse)
def google_login(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    return google_auth_service(data, db)

@router.post("/google/complete-role", response_model=TokenResponse)
def complete_google_role(data: GoogleRoleCompleteRequest, db: Session = Depends(get_db)):
    return complete_google_role_service(data, db)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
