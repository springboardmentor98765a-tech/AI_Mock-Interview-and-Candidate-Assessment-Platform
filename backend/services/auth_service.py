import os
import requests
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.user import User
from models.candidate import CandidateProfile
from models.recruiter import RecruiterProfile
from schemas.auth import CandidateRegisterRequest, RecruiterRegisterRequest, LoginRequest, GoogleAuthRequest, GoogleRoleCompleteRequest, TokenResponse
from security.password import hash_password, verify_password
from security.jwt import create_access_token

def verify_google_id_token(token: str) -> dict:
    """
    Verifies the Google ID Token using official google-auth SDK with tokeninfo API endpoint fallback.
    Fails gracefully if GOOGLE_CLIENT_ID environment variable is missing.
    """
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google ID Token is required."
        )
    
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not google_client_id or not google_client_id.strip():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Client ID is not configured on the server."
        )
    
    client_id_clean = google_client_id.strip()

    # 1. Primary verification via official google-auth SDK
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        
        id_info = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=client_id_clean
        )
        return id_info
    except ValueError as ve:
        # Invalid signature, expired token, or audience mismatch
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Google ID Token: {str(ve)}"
        )
    except Exception as primary_err:
        # 2. Fallback verification via Google tokeninfo endpoint for network/cert/import errors
        try:
            resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                aud = data.get("aud")
                if aud and (aud == client_id_clean or client_id_clean in aud):
                    return data
        except requests.RequestException:
            pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Google ID Token: {str(primary_err)}"
        )

def register_candidate_service(data: CandidateRegisterRequest, db: Session) -> TokenResponse:
    clean_email = data.email.strip().lower()
    clean_name = data.name.strip()

    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered."
        )
    
    hashed_pwd = hash_password(data.password)
    new_user = User(
        name=clean_name,
        email=clean_email,
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
        phone=data.phone.strip() if data.phone else None,
        college=data.college.strip() if data.college else None,
        degree=data.degree.strip() if data.degree else None,
        branch=data.branch.strip() if data.branch else None,
        graduation_year=data.graduation_year,
        skills=data.skills.strip() if data.skills else None,
        preferred_role=data.preferred_role.strip() if data.preferred_role else "Software Engineer",
        experience_level=data.experience_level.strip() if data.experience_level else "Entry-Level",
        linkedin=data.linkedin.strip() if data.linkedin else None,
        github=data.github.strip() if data.github else None,
        portfolio=data.portfolio.strip() if data.portfolio else None,
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
    clean_email = data.email.strip().lower()
    clean_name = data.name.strip()
    clean_company = data.company_name.strip() if data.company_name else None
    clean_designation = data.designation.strip() if data.designation else None

    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered."
        )

    hashed_pwd = hash_password(data.password)
    new_user = User(
        name=clean_name,
        email=clean_email,
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
        company_name=clean_company,
        company_email=data.company_email.strip().lower() if data.company_email else clean_email,
        designation=clean_designation,
        phone=data.phone.strip() if data.phone else None,
        website=data.website.strip() if data.website else None,
        industry=data.industry.strip() if data.industry else "Technology",
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
    clean_email = data.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
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
    id_info = verify_google_id_token(data.token)
    
    email_raw = id_info.get("email")
    if not email_raw or not email_raw.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token does not contain a verified email address."
        )
    
    target_email = email_raw.strip().lower()
    raw_name = id_info.get("name") or (data.name.strip() if data.name else None) or target_email.split("@")[0].title()
    target_name = raw_name.strip() if raw_name else ""
    picture = id_info.get("picture") or data.picture

    user = db.query(User).filter(User.email == target_email).first()

    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your user account is suspended or deactivated. Please contact admin."
            )
        # Link account if previously local provider
        if user.provider != "GOOGLE":
            user.provider = "GOOGLE"

        # Update display name if user has none
        if (not user.name or not user.name.strip()) and target_name:
            user.name = target_name

        # Preserve profile picture for candidate if not already custom uploaded
        user_picture = None
        if user.role == "CANDIDATE" and user.candidate_profile:
            if not user.candidate_profile.profile_picture or not user.candidate_profile.profile_picture.strip():
                if picture:
                    user.candidate_profile.profile_picture = picture
            user_picture = user.candidate_profile.profile_picture

        db.commit()

        token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
        return TokenResponse(
            access_token=token,
            user_id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            provider=user.provider,
            role_required=False,
            picture=user_picture or picture
        )

    # User does not exist, signal frontend to prompt for Candidate vs Recruiter role
    # Pass verified Google profile information (email, name, picture) in TokenResponse
    return TokenResponse(
        access_token="",
        user_id=0,
        name=target_name,
        email=target_email,
        role="UNKNOWN",
        provider="GOOGLE",
        role_required=True,
        picture=picture
    )

def complete_google_role_service(data: GoogleRoleCompleteRequest, db: Session) -> TokenResponse:
    target_email = data.email.strip().lower()
    target_name = data.name.strip() if data.name else ""
    picture = data.picture

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
            role_required=False,
            picture=picture
        )

    role = data.role.strip().upper() if data.role else ""
    # Reject any role other than CANDIDATE or RECRUITER
    if role not in ["CANDIDATE", "RECRUITER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Only Candidate and Recruiter accounts can be created using Google Sign-In."
        )

    new_user = User(
        name=target_name,
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
            profile_picture=picture,
            ats_score=88.0,
            interview_score=92.0,
            preferred_role="Software Engineer"
        )
        db.add(profile)
    else:
        rec_company = data.company_name.strip() if data.company_name and data.company_name.strip() else None
        rec_designation = data.designation.strip() if getattr(data, "designation", None) and data.designation.strip() else None
        profile = RecruiterProfile(
            user_id=new_user.id,
            company_name=rec_company,
            company_email=target_email,
            designation=rec_designation
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
        role_required=False,
        picture=picture
    )



