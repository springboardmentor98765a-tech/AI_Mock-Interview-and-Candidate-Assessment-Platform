from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.user import User
from models.candidate import CandidateProfile
from models.recruiter import RecruiterProfile
from schemas.recruiter import RecruiterProfileUpdate, RecruiterProfileResponse
from schemas.candidate import CandidateRankingItem

def get_recruiter_profile_service(current_user: User, db: Session) -> RecruiterProfileResponse:
    profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == current_user.id).first()
    if not profile:
        profile = RecruiterProfile(
            user_id=current_user.id,
            company_name="SmartHire Client",
            company_email=current_user.email,
            designation="Recruiter",
            verification_status="VERIFIED"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return RecruiterProfileResponse(
        id=profile.id,
        user_id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        company_name=profile.company_name,
        company_email=profile.company_email,
        designation=profile.designation,
        phone=profile.phone,
        website=profile.website,
        industry=profile.industry,
        verification_status=profile.verification_status,
        role=current_user.role,
        provider=current_user.provider
    )

def update_recruiter_profile_service(current_user: User, data: RecruiterProfileUpdate, db: Session) -> RecruiterProfileResponse:
    if data.name:
        current_user.name = data.name
        db.commit()

    profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == current_user.id).first()
    if not profile:
        profile = RecruiterProfile(user_id=current_user.id)
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

    return get_recruiter_profile_service(current_user, db)

def get_candidate_rankings_service(
    db: Session,
    search: Optional[str] = None,
    role_filter: Optional[str] = None,
    min_score: Optional[float] = 0.0,
    sort_by: Optional[str] = "overall"
) -> List[CandidateRankingItem]:
    # Query Candidate users with their candidate profile
    candidates_query = db.query(User, CandidateProfile).join(
        CandidateProfile, User.id == CandidateProfile.user_id
    ).filter(User.role == "CANDIDATE", User.is_active == True)

    results = candidates_query.all()
    ranking_items: List[dict] = []

    for user, profile in results:
        ats = profile.ats_score or 0.0
        interview = profile.interview_score or 0.0
        # Overall Score: 70% ATS Score + 30% Interview Score
        overall = round((0.70 * ats) + (0.30 * interview), 2)

        # Filtering logic
        if min_score and min_score > 0 and overall < min_score:
            continue

        if role_filter and role_filter.upper() != "ALL":
            if not profile.preferred_role or role_filter.lower() not in profile.preferred_role.lower():
                continue

        if search:
            q = search.lower()
            match_name = q in user.name.lower()
            match_email = q in user.email.lower()
            match_role = profile.preferred_role and q in profile.preferred_role.lower()
            match_skills = profile.skills and q in profile.skills.lower()
            if not (match_name or match_email or match_role or match_skills):
                continue

        ranking_items.append({
            "user_id": user.id,
            "candidate_name": user.name,
            "email": user.email,
            "ats_score": ats,
            "interview_score": interview,
            "overall_score": overall,
            "preferred_role": profile.preferred_role or "Software Engineer",
            "skills": profile.skills,
            "college": profile.college,
            "degree": profile.degree
        })

    # Sort logic
    if sort_by == "ats":
        ranking_items.sort(key=lambda x: x["ats_score"], reverse=True)
    elif sort_by == "interview":
        ranking_items.sort(key=lambda x: x["interview_score"], reverse=True)
    elif sort_by == "name":
        ranking_items.sort(key=lambda x: x["candidate_name"].lower())
    else:  # overall
        ranking_items.sort(key=lambda x: x["overall_score"], reverse=True)

    # Assign 1-indexed ranks
    final_rankings: List[CandidateRankingItem] = []
    for idx, item in enumerate(ranking_items, start=1):
        item["rank"] = idx
        final_rankings.append(CandidateRankingItem(**item))

    return final_rankings
