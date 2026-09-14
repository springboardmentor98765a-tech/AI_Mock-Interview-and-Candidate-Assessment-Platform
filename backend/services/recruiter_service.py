import json
import datetime
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.user import User
from models.candidate import CandidateProfile, ResumeUpload, InterviewHistory
from models.recruiter import RecruiterProfile, InterviewTemplate
from schemas.recruiter import (
    RecruiterProfileUpdate,
    RecruiterProfileResponse,
    InterviewTemplateCreate,
    InterviewTemplateUpdate,
    InterviewTemplateResponse
)
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
    current_user: Optional[User] = None,
    search: Optional[str] = None,
    role_filter: Optional[str] = None,
    min_score: Optional[float] = 0.0,
    sort_by: Optional[str] = "overall"
) -> List[CandidateRankingItem]:
    from models.consent import InterviewConsent
    from models.interview import Interview, InterviewSession, CandidatePerformanceReport
    from services.consent_service import check_recruiter_score_access

    candidates_query = db.query(User, CandidateProfile).outerjoin(
        CandidateProfile, User.id == CandidateProfile.user_id
    ).filter(User.role == "CANDIDATE", User.is_active == True)

    results = candidates_query.all()
    ranking_items: List[dict] = []

    for user, profile in results:
        interview_obj = db.query(Interview).filter(
            Interview.candidate_id == user.id,
            Interview.is_deleted == False
        ).order_by(Interview.created_at.desc()).first()

        has_active_consent = False
        if interview_obj:
            if current_user:
                has_active_consent = check_recruiter_score_access(db, current_user, interview_obj.id)
            else:
                consent = db.query(InterviewConsent).filter(
                    InterviewConsent.interview_id == interview_obj.id,
                    InterviewConsent.candidate_id == user.id
                ).first()
                has_active_consent = bool(consent and consent.consent_given and consent.revoked_at is None)

        report = None
        if interview_obj and has_active_consent:
            report = db.query(CandidatePerformanceReport).filter(
                (CandidatePerformanceReport.interview_id == interview_obj.id) |
                (CandidatePerformanceReport.session_id.in_(db.query(InterviewSession.id).filter(InterviewSession.interview_id == interview_obj.id)))
            ).first()

        if has_active_consent:
            raw_ats = profile.ats_score if (profile and profile.ats_score is not None) else None
            raw_int = profile.interview_score if (profile and profile.interview_score is not None) else None
            if raw_ats is not None or raw_int is not None:
                overall = round((0.70 * (raw_ats or 0.0)) + (0.30 * (raw_int or 0.0)), 2)
            else:
                overall = None
            tech_score = report.technical_relevance_score if (report and report.technical_relevance_score is not None) else None
            comm_score = report.communication_score if (report and report.communication_score is not None) else None
        else:
            # STRICT PRIVACY: Scores set to None (null in JSON), NOT 0.0
            raw_ats = None
            raw_int = None
            overall = None
            tech_score = None
            comm_score = None

        pref_role = (profile.preferred_role if profile and profile.preferred_role else "Software Engineer")
        skills = profile.skills if profile else None
        college = profile.college if profile else None
        degree = profile.degree if profile else None

        if min_score and min_score > 0 and (overall is None or overall < min_score):
            continue

        if role_filter and role_filter.upper() != "ALL":
            if not pref_role or role_filter.lower() not in pref_role.lower():
                continue

        if search:
            q = search.lower()
            match_name = q in user.name.lower()
            match_email = q in user.email.lower()
            match_role = pref_role and q in pref_role.lower()
            match_skills = skills and q in skills.lower()
            if not (match_name or match_email or match_role or match_skills):
                continue

        ranking_items.append({
            "user_id": user.id,
            "candidate_name": user.name,
            "email": user.email,
            "ats_score": raw_ats,
            "interview_score": raw_int,
            "overall_score": overall,
            "preferred_role": pref_role,
            "skills": skills,
            "college": college,
            "degree": degree,
            "resume": profile.resume if (profile and profile.resume) else None,
            "interview_id": interview_obj.id if interview_obj else None,
            "consent_given": has_active_consent,
            "technical_score": tech_score,
            "communication_score": comm_score
        })

    def safe_sort_key(x):
        val = x.get(sort_by if sort_by in ["ats_score", "interview_score", "overall_score"] else "overall_score")
        if sort_by == "name" or sort_by == "candidate_name":
            return x.get("candidate_name", "").lower()
        return -999.0 if val is None else float(val)

    ranking_items.sort(key=safe_sort_key, reverse=(sort_by != "name" and sort_by != "candidate_name"))

    final_results = []
    for idx, item in enumerate(ranking_items, 1):
        item["rank"] = idx
        final_results.append(CandidateRankingItem(**item))

    return final_results

# --- Template CRUD Services ---

def get_interview_templates_service(current_user: User, db: Session) -> list:
    templates = db.query(InterviewTemplate).filter(InterviewTemplate.recruiter_id == current_user.id).order_by(InterviewTemplate.created_at.desc()).all()
    res = []
    for t in templates:
        questions_list = []
        if t.questions:
            try:
                questions_list = json.loads(t.questions)
            except Exception:
                questions_list = [t.questions]
        res.append({
            "id": t.id,
            "recruiter_id": t.recruiter_id,
            "title": t.title,
            "description": t.description,
            "category": t.category,
            "difficulty": t.difficulty,
            "duration_mins": t.duration_mins,
            "questions": questions_list,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M")
        })
    return res

def create_interview_template_service(current_user: User, data: InterviewTemplateCreate, db: Session) -> dict:
    questions_json = json.dumps(data.questions)
    template = InterviewTemplate(
        recruiter_id=current_user.id,
        title=data.title,
        description=data.description,
        category=data.category,
        difficulty=data.difficulty,
        duration_mins=data.duration_mins,
        questions=questions_json,
        created_at=datetime.datetime.utcnow()
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return {
        "id": template.id,
        "recruiter_id": template.recruiter_id,
        "title": template.title,
        "description": template.description,
        "category": template.category,
        "difficulty": template.difficulty,
        "duration_mins": template.duration_mins,
        "questions": data.questions,
        "created_at": template.created_at.strftime("%Y-%m-%d %H:%M")
    }

def update_interview_template_service(current_user: User, template_id: int, data: InterviewTemplateUpdate, db: Session) -> dict:
    template = db.query(InterviewTemplate).filter(
        InterviewTemplate.id == template_id,
        InterviewTemplate.recruiter_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Interview template not found.")

    if data.title is not None: template.title = data.title
    if data.description is not None: template.description = data.description
    if data.category is not None: template.category = data.category
    if data.difficulty is not None: template.difficulty = data.difficulty
    if data.duration_mins is not None: template.duration_mins = data.duration_mins
    if data.questions is not None: template.questions = json.dumps(data.questions)

    db.commit()
    db.refresh(template)

    questions_list = json.loads(template.questions) if template.questions else []
    return {
        "id": template.id,
        "recruiter_id": template.recruiter_id,
        "title": template.title,
        "description": template.description,
        "category": template.category,
        "difficulty": template.difficulty,
        "duration_mins": template.duration_mins,
        "questions": questions_list,
        "created_at": template.created_at.strftime("%Y-%m-%d %H:%M")
    }

def delete_interview_template_service(current_user: User, template_id: int, db: Session) -> dict:
    template = db.query(InterviewTemplate).filter(
        InterviewTemplate.id == template_id,
        InterviewTemplate.recruiter_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Interview template not found.")
    db.delete(template)
    db.commit()
    return {"message": "Interview template deleted successfully."}

def duplicate_interview_template_service(current_user: User, template_id: int, db: Session) -> dict:
    template = db.query(InterviewTemplate).filter(
        InterviewTemplate.id == template_id,
        InterviewTemplate.recruiter_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Interview template not found.")

    new_template = InterviewTemplate(
        recruiter_id=current_user.id,
        title=f"Copy of {template.title}",
        description=template.description,
        category=template.category,
        difficulty=template.difficulty,
        duration_mins=template.duration_mins,
        questions=template.questions,
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    questions_list = json.loads(new_template.questions) if new_template.questions else []
    return {
        "id": new_template.id,
        "recruiter_id": new_template.recruiter_id,
        "title": new_template.title,
        "description": new_template.description,
        "category": new_template.category,
        "difficulty": new_template.difficulty,
        "duration_mins": new_template.duration_mins,
        "questions": questions_list,
        "created_at": new_template.created_at.strftime("%Y-%m-%d %H:%M")
    }

# --- Recruiter Candidate Analytics & Comparison ---

def get_recruiter_analytics_service(db: Session) -> dict:
    total_candidates = db.query(User).filter(User.role == "CANDIDATE", User.is_active == True).count()
    total_interviews = db.query(InterviewHistory).count()

    all_scores = [h.score for h in db.query(InterviewHistory).all()]
    avg_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

    resume_count = db.query(ResumeUpload).count()
    if resume_count == 0:
        resume_count = db.query(CandidateProfile).filter(CandidateProfile.resume != None).count()

    return {
        "registered_candidates": total_candidates,
        "completed_interviews": total_interviews,
        "average_score": avg_score,
        "resume_uploads_count": resume_count
    }

def compare_candidates_service(candidate_ids: List[int], db: Session) -> list:
    results = []
    users = db.query(User).filter(User.id.in_(candidate_ids)).all()
    for user in users:
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
        interviews = db.query(InterviewHistory).filter(InterviewHistory.candidate_id == user.id).all()
        completed_cnt = len(interviews)
        avg_score = round(sum(i.score for i in interviews) / completed_cnt, 1) if completed_cnt > 0 else (profile.interview_score if profile and profile.interview_score is not None else 0.0)
        
        has_resume = bool(profile and profile.resume)
        resume_link = f"/uploads/resumes/{profile.resume}" if (profile and profile.resume) else "Not Uploaded"

        results.append({
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "role": profile.preferred_role if profile else "Software Engineer",
            "college": profile.college if profile else "N/A",
            "degree": profile.degree if profile else "N/A",
            "ats_score": profile.ats_score if (profile and profile.ats_score is not None) else 0.0,
            "interview_score": avg_score,
            "completed_interviews": completed_cnt,
            "resume_status": "Uploaded" if has_resume else "Missing",
            "resume_link": resume_link
        })
    return results

def get_monitoring_sessions_service(db: Session) -> list:
    from models.interview import InterviewSession, Interview
    real_sessions = db.query(InterviewSession).order_by(InterviewSession.created_at.desc()).limit(10).all()
    sessions = []

    for s in real_sessions:
        cand_user = db.query(User).filter(User.id == s.candidate_id).first()
        interview_obj = db.query(Interview).filter(Interview.id == s.interview_id).first()

        cand_name = cand_user.name if cand_user else f"Candidate #{s.candidate_id}"
        role_title = interview_obj.domain if interview_obj else "Software Engineer"
        category = interview_obj.interview_type if interview_obj else "Technical"

        progress = 100 if s.status in ["COMPLETED", "ENDED", "TERMINATED"] else (50 if s.status == "IN_PROGRESS" else 0)

        sessions.append({
            "session_id": s.id,
            "candidate_name": cand_name,
            "target_role": role_title,
            "category": category,
            "status": s.status,
            "progress_percentage": progress,
            "time_remaining_mins": 0 if progress == 100 else 15,
            "started_at": s.created_at.strftime("%b %d, %H:%M") if s.created_at else "N/A"
        })

    return sessions

