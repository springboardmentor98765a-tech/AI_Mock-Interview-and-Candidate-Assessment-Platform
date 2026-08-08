"""
routes/resume_routes.py
=========================
Module 2 - Resume Parsing & Analysis.

    POST /resume/upload    upload a PDF/DOCX resume, run the full parsing
                            pipeline (skills, experience, education, summary)
                            and store the results
    GET  /resume            see the currently stored resume analysis
    GET  /resume/summary    just the generated summary text (lightweight)

The extracted skills also feed into Module 3 (interview generation) when
the candidate sets `use_resume_skills: true` on POST /interviews/generate,
so questions are based on what's actually on their resume instead of a
manually-typed domain.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import ResumeOut
from app.auth import get_current_user
from app.resume_parser import (
    extract_resume_text,
    extract_skills,
    extract_skills_by_category,
    extract_total_experience_years,
    extract_work_experience,
    extract_education,
    generate_resume_summary,
    compute_resume_score,
)

router = APIRouter(prefix="/resume", tags=["Resume"])

MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def _to_resume_out(user: User) -> ResumeOut:
    skills = user.resume_skills.split(",") if user.resume_skills else []
    skills = [s for s in skills if s]
    return ResumeOut(
        resume_file_name=user.resume_file_name,
        resume_skills=skills,
        resume_skills_by_category=user.resume_skills_by_category or {},
        resume_experience_years=user.resume_experience_years,
        resume_experience=user.resume_experience or [],
        resume_education=user.resume_education or [],
        resume_summary=user.resume_summary,
        resume_score=compute_resume_score(
            skills=skills,
            experience_years=user.resume_experience_years,
            experience=user.resume_experience or [],
            education=user.resume_education or [],
            summary=user.resume_summary,
        ) if user.resume_uploaded_at else None,
        resume_uploaded_at=user.resume_uploaded_at,
    )


@router.post("/upload", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_bytes = await file.read()

    if len(file_bytes) > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume file is too large (max 5 MB).",
        )

    # 1. Extract raw text (PDF or DOCX)
    resume_text = extract_resume_text(file_bytes, file.filename)

    # 2. Technology detection
    skills = extract_skills(resume_text)
    skills_by_category = extract_skills_by_category(resume_text)

    if not skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Couldn't find any recognizable skills in that resume. "
                   "Try a resume with a clear Skills section, or set a domain manually instead.",
        )

    # 3. Experience parsing
    experience_years = extract_total_experience_years(resume_text)
    experience = extract_work_experience(resume_text)

    # 4. Education analysis
    education = extract_education(resume_text)

    # 5. Resume summary generation (uses everything extracted above)
    summary = generate_resume_summary(
        resume_text=resume_text,
        skills=skills,
        experience_years=experience_years,
        experience=experience,
        education=education,
    )

    current_user.resume_file_name = file.filename
    current_user.resume_text = resume_text
    current_user.resume_skills = ",".join(skills)
    current_user.resume_skills_by_category = skills_by_category
    current_user.resume_experience_years = experience_years
    current_user.resume_experience = experience
    current_user.resume_education = education
    current_user.resume_summary = summary
    current_user.resume_uploaded_at = datetime.utcnow()

    db.commit()
    db.refresh(current_user)

    return _to_resume_out(current_user)


@router.get("", response_model=ResumeOut)
def get_resume(current_user: User = Depends(get_current_user)):
    if not current_user.resume_uploaded_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume on file yet. Upload one via POST /resume/upload first.",
        )
    return _to_resume_out(current_user)


@router.get("/summary")
def get_resume_summary(current_user: User = Depends(get_current_user)):
    if not current_user.resume_uploaded_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume on file yet. Upload one via POST /resume/upload first.",
        )
    return {"resume_summary": current_user.resume_summary}
