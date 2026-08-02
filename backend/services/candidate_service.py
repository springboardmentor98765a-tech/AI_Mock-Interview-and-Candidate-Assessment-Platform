import os
import shutil
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from models.user import User
from models.candidate import CandidateProfile
from schemas.candidate import CandidateProfileUpdate, CandidateProfileResponse

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream"  # For strict browser binary compatibility
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def get_candidate_profile_service(current_user: User, db: Session) -> CandidateProfileResponse:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        profile = CandidateProfile(
            user_id=current_user.id,
            ats_score=85.0,
            interview_score=90.0,
            preferred_role="Software Engineer"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return CandidateProfileResponse(
        id=profile.id,
        user_id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        phone=profile.phone,
        college=profile.college,
        degree=profile.degree,
        branch=profile.branch,
        graduation_year=profile.graduation_year,
        skills=profile.skills,
        preferred_role=profile.preferred_role,
        experience_level=profile.experience_level,
        linkedin=profile.linkedin,
        github=profile.github,
        portfolio=profile.portfolio,
        resume=profile.resume,
        ats_score=profile.ats_score,
        interview_score=profile.interview_score,
        profile_picture=profile.profile_picture,
        role=current_user.role,
        provider=current_user.provider
    )

def update_candidate_profile_service(current_user: User, data: CandidateProfileUpdate, db: Session) -> CandidateProfileResponse:
    if data.name:
        current_user.name = data.name
        db.commit()

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data:
        del update_data["name"]

    for key, value in update_data.items():
        if hasattr(profile, key) and value is not None:
            setattr(profile, key, value)

    db.commit()
    db.refresh(profile)

    return get_candidate_profile_service(current_user, db)

def upload_resume_service(current_user: User, file: UploadFile, db: Session) -> dict:
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{ext}'. Allowed extensions are: .pdf, .doc, .docx"
        )

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file MIME type '{file.content_type}'."
        )

    # Read file bytes to check size
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed limit of 5 MB."
        )

    upload_dir = os.path.join(os.getcwd(), "uploads", "resumes")
    os.makedirs(upload_dir, exist_ok=True)
    
    safe_filename = f"user_{current_user.id}_{int(os.path.getmtime(upload_dir) if os.path.exists(upload_dir) else 1)}{ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)

    profile.resume = safe_filename
    db.commit()

    return {"message": "Resume uploaded successfully.", "filename": safe_filename}
