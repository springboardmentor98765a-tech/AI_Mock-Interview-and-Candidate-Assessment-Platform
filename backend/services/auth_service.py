from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.user import User
from models.candidate import CandidateProfile
from models.recruiter import RecruiterProfile
from schemas.auth import CandidateRegisterRequest, RecruiterRegisterRequest, LoginRequest, GoogleAuthRequest, GoogleRoleCompleteRequest, TokenResponse
from security.password import hash_password, verify_password
from security.jwt import create_access_token

def register_candidate_service(data: CandidateRegisterRequest, db: Session) -> TokenResponse:
    existing_user = db.query(User).filter(User.email == data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered."
        )
    
    hashed_pwd = hash_password(data.password)
    new_user = User(
        name=data.name,
        email=data.email.lower(),
        password=hashed_pwd,
        role="CANDIDATE",
        provider="LOCAL",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    candidate_profile = CandidateProfile(
        user_id=new_user.id,
        phone=data.phone,
        college=data.college,
        degree=data.degree,
        branch=data.branch,
        graduation_year=data.graduation_year,
        skills=data.skills,
        preferred_role=data.preferred_role or "Software Engineer",
        experience_level=data.experience_level or "Entry-Level",
        linkedin=data.linkedin,
        github=data.github,
        portfolio=data.portfolio,
        ats_score=85.0,
        interview_score=90.0
    )
    db.add(candidate_profile)
    db.commit()

    token = create_access_token({"sub": str(new_user.id), "email": new_user.email, "role": new_user.role})
    return TokenResponse(
        access_token=token,
        user_id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        provider=new_user.provider
    )

def register_recruiter_service(data: RecruiterRegisterRequest, db: Session) -> TokenResponse:
    existing_user = db.query(User).filter(User.email == data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered."
        )

    hashed_pwd = hash_password(data.password)
    new_user = User(
        name=data.name,
        email=data.email.lower(),
        password=hashed_pwd,
        role="RECRUITER",
        provider="LOCAL",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    recruiter_profile = RecruiterProfile(
        user_id=new_user.id,
        company_name=data.company_name,
        company_email=data.company_email or data.email.lower(),
        designation=data.designation or "Recruiter",
        phone=data.phone,
        website=data.website,
        industry=data.industry or "Technology",
        verification_status="VERIFIED"
    )
    db.add(recruiter_profile)
    db.commit()

    token = create_access_token({"sub": str(new_user.id), "email": new_user.email, "role": new_user.role})
    return TokenResponse(
        access_token=token,
        user_id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        provider=new_user.provider
    )

def login_user_service(data: LoginRequest, db: Session) -> TokenResponse:
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your user account is suspended or deactivated. Please contact admin."
        )
    if user.password and not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        provider=user.provider
    )

def google_auth_service(data: GoogleAuthRequest, db: Session) -> TokenResponse:
    target_email = data.email.lower() if data.email else "google.user@smarthire.ai"
    user = db.query(User).filter(User.email == target_email).first()

    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended."
            )
        # Link account if previously local
        if user.provider != "GOOGLE":
            user.provider = "GOOGLE"
            db.commit()

        token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
        return TokenResponse(
            access_token=token,
            user_id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            provider=user.provider,
            role_required=False
        )

    # User does not exist, signal frontend to ask role
    return TokenResponse(
        access_token="",
        user_id=0,
        name=data.name or "Google User",
        email=target_email,
        role="UNKNOWN",
        provider="GOOGLE",
        role_required=True
    )

def complete_google_role_service(data: GoogleRoleCompleteRequest, db: Session) -> TokenResponse:
    target_email = data.email.lower()
    existing_user = db.query(User).filter(User.email == target_email).first()
    
    if existing_user:
        token = create_access_token({"sub": str(existing_user.id), "email": existing_user.email, "role": existing_user.role})
        return TokenResponse(
            access_token=token,
            user_id=existing_user.id,
            name=existing_user.name,
            email=existing_user.email,
            role=existing_user.role,
            provider=existing_user.provider,
            role_required=False
        )

    role = data.role.upper()
    if role not in ["CANDIDATE", "RECRUITER"]:
        role = "CANDIDATE"

    new_user = User(
        name=data.name,
        email=target_email,
        password=None,
        role=role,
        provider="GOOGLE",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if role == "CANDIDATE":
        profile = CandidateProfile(
            user_id=new_user.id,
            profile_picture=data.picture,
            ats_score=88.0,
            interview_score=92.0,
            preferred_role="Software Engineer"
        )
        db.add(profile)
    else:
        profile = RecruiterProfile(
            user_id=new_user.id,
            company_name="Innovate Tech",
            company_email=target_email,
            designation="Recruitment Specialist"
        )
        db.add(profile)
    
    db.commit()

    token = create_access_token({"sub": str(new_user.id), "email": new_user.email, "role": new_user.role})
    return TokenResponse(
        access_token=token,
        user_id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        provider=new_user.provider,
        role_required=False
    )
