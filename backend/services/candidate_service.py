import os
import json
import time
import shutil
import datetime
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from models.user import User
from models.candidate import CandidateProfile, ResumeUpload, InterviewHistory
from schemas.candidate import CandidateProfileUpdate, CandidateProfileResponse, InterviewSubmitRequest

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream"  # For strict browser binary compatibility
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

PREDEFINED_QUESTIONS = {
    "Technical": [
        {
            "id": 1,
            "question": "What is the key difference between optimistic and pessimistic locking in PostgreSQL?",
            "options": [
                "Optimistic locking uses row-level locks immediately; pessimistic locking checks version numbers on commit.",
                "Pessimistic locking locks the row upon reading; optimistic locking verifies version/timestamp during commit.",
                "Optimistic locking requires Redis; pessimistic locking requires SQLite.",
                "There is no difference in PostgreSQL."
            ],
            "correct": 1,
            "category": "Technical",
            "difficulty": "HARD"
        },
        {
            "id": 2,
            "question": "How does React Fiber enable concurrent rendering in modern React applications?",
            "options": [
                "By replacing the DOM with canvas rendering.",
                "By breaking work into units called fibers, allowing rendering to be paused, resumed, or discarded.",
                "By running all state changes synchronously in a web worker.",
                "By using jQuery under the hood."
            ],
            "correct": 1,
            "category": "Technical",
            "difficulty": "MEDIUM"
        },
        {
            "id": 3,
            "question": "Which HTTP status code represents a forbidden request due to insufficient role permissions?",
            "options": ["401 Unauthorized", "403 Forbidden", "404 Not Found", "500 Internal Server Error"],
            "correct": 1,
            "category": "Technical",
            "difficulty": "EASY"
        },
        {
            "id": 4,
            "question": "What is the main benefit of using JWT (JSON Web Tokens) for API authentication?",
            "options": [
                "Stateless authentication where the server verifies signatures without database session lookups.",
                "Automatic encryption of all SQL queries.",
                "JWTs never expire.",
                "JWTs bypass CORS checks."
            ],
            "correct": 0,
            "category": "Technical",
            "difficulty": "MEDIUM"
        },
        {
            "id": 5,
            "question": "What is the time complexity of searching for an element in a balanced Binary Search Tree (BST)?",
            "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
            "correct": 2,
            "category": "Technical",
            "difficulty": "EASY"
        }
    ],
    "HR": [
        {
            "id": 101,
            "question": "Where do you see yourself professionally in the next 3 to 5 years?",
            "options": [
                "Leading technical architecture projects and mentoring junior engineering talent.",
                "Switching non-technical industries completely.",
                "Remaining in the exact same entry role without taking on new scope.",
                "I haven't thought about the future."
            ],
            "correct": 0,
            "category": "HR",
            "difficulty": "EASY"
        },
        {
            "id": 102,
            "question": "How do you prioritize competing deadlines when multiple high-priority tasks arrive simultaneously?",
            "options": [
                "Assess business impact and urgency, communicate clear expectations with stakeholders, and execute systematically.",
                "Ignore incoming tickets and work on whatever is easiest.",
                "Work 24 hours without informing anyone.",
                "Ask a colleague to do all the work."
            ],
            "correct": 0,
            "category": "HR",
            "difficulty": "MEDIUM"
        },
        {
            "id": 103,
            "question": "What motivates you most when working on high-complexity software engineering projects?",
            "options": [
                "Solving difficult technical problems and delivering measurable user value.",
                "Copying code without understanding.",
                "Only working when monitored.",
                "Avoiding code reviews."
            ],
            "correct": 0,
            "category": "HR",
            "difficulty": "EASY"
        },
        {
            "id": 104,
            "question": "Describe your approach to receiving constructive feedback during a peer code review.",
            "options": [
                "Welcome feedback objectively, understand the reasoning, and collaborate to improve code quality.",
                "Take it personally and reject suggestions.",
                "Ignore comments and merge anyway.",
                "Argue without reviewing recommendations."
            ],
            "correct": 0,
            "category": "HR",
            "difficulty": "EASY"
        },
        {
            "id": 105,
            "question": "Why do you want to join SmartHire AI's engineering team?",
            "options": [
                "To contribute to cutting-edge assessment tools and grow alongside high-caliber developers.",
                "Just for the title.",
                "I clicked randomly.",
                "No particular reason."
            ],
            "correct": 0,
            "category": "HR",
            "difficulty": "EASY"
        }
    ],
    "Behavioral": [
        {
            "id": 201,
            "question": "Describe a situation where a production bug occurred right before a release deadline.",
            "options": [
                "Stay calm, reproduce the issue in isolation, write a targeted regression test, patch, and post-mortem.",
                "Panic and push untested code straight to main branch.",
                "Blame the testing team publicly.",
                "Delay the release by a month without explanation."
            ],
            "correct": 0,
            "category": "Behavioral",
            "difficulty": "HARD"
        },
        {
            "id": 202,
            "question": "How do you resolve a technical disagreement with a senior architect regarding system architecture?",
            "options": [
                "Prepare data-backed benchmarks, present trade-offs objectively, and align with team decisions.",
                "Refuse to write code until your idea is picked.",
                "Complain to external parties.",
                "Silently change the code in production."
            ],
            "correct": 0,
            "category": "Behavioral",
            "difficulty": "MEDIUM"
        },
        {
            "id": 203,
            "question": "Give an example of how you handled learning an unfamiliar technology stack under tight time constraints.",
            "options": [
                "Build a small proof-of-concept, read official docs, leverage community examples, and implement incrementally.",
                "Give up and say it is impossible.",
                "Wait for someone else to build it.",
                "Use deprecated outdated patterns."
            ],
            "correct": 0,
            "category": "Behavioral",
            "difficulty": "MEDIUM"
        },
        {
            "id": 204,
            "question": "How do you handle working with a cross-functional team member who communicates infrequently?",
            "options": [
                "Establish structured async check-ins, clarify shared goals, and offer proactive help.",
                "Exclude them from project meetings.",
                "Send angry messages.",
                "Do nothing."
            ],
            "correct": 0,
            "category": "Behavioral",
            "difficulty": "EASY"
        },
        {
            "id": 205,
            "question": "Describe a project where you took initiative beyond your assigned responsibilities.",
            "options": [
                "Identified a major performance bottleneck, benchmarked fixes, and refactored the module boosting throughput.",
                "Did strictly the minimum requirement.",
                "Claimed credit for another engineer's work.",
                "Refactored code without testing."
            ],
            "correct": 0,
            "category": "Behavioral",
            "difficulty": "MEDIUM"
        }
    ]
}

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
        ats_score=profile.ats_score or 85.0,
        interview_score=profile.interview_score or 90.0,
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
    
    timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"resume_user_{current_user.id}_{timestamp_str}{ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Save Resume Upload Metadata Record in DB
    resume_rec = ResumeUpload(
        user_id=current_user.id,
        filename=safe_filename,
        original_filename=file.filename,
        file_size=file_size,
        file_format=ext.replace(".", "").upper(),
        uploaded_at=datetime.datetime.utcnow()
    )
    db.add(resume_rec)

    # Update Candidate Profile resume column
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)

    profile.resume = safe_filename
    db.commit()

    upload_timestamp = resume_rec.uploaded_at.strftime("%b %d, %Y %I:%M %p")

    return {
        "filename": safe_filename,
        "original_filename": file.filename,
        "file_size": file_size,
        "file_format": ext.replace(".", "").upper(),
        "uploaded_at": upload_timestamp,
        "url": f"/uploads/resumes/{safe_filename}"
    }

def get_questions_service(category: str = "Technical") -> list:
    category_key = category.strip()
    if category_key not in PREDEFINED_QUESTIONS:
        category_key = "Technical"
    return PREDEFINED_QUESTIONS[category_key]

def submit_mock_interview_service(current_user: User, data: InterviewSubmitRequest, db: Session) -> dict:
    questions = PREDEFINED_QUESTIONS.get(data.category, PREDEFINED_QUESTIONS["Technical"])
    total_q = len(questions)
    correct_count = 0

    for idx, q in enumerate(questions):
        if idx < len(data.answers):
            ans = data.answers[idx]
            if ans.selected_option is not None:
                try:
                    if int(ans.selected_option) == q.get("correct"):
                        correct_count += 1
                except ValueError:
                    pass

    # Calculate deterministic percentage score
    score = round((correct_count / total_q) * 100.0, 1) if total_q > 0 else 80.0
    answered_q = len([a for a in data.answers if a.selected_option is not None or a.user_answer])

    answers_dump = json.dumps([a.model_dump() for a in data.answers])

    history_entry = InterviewHistory(
        candidate_id=current_user.id,
        category=data.category,
        target_role=data.target_role or "Software Engineer",
        session_type=f"{data.category} Practice Round",
        status="COMPLETED",
        score=score,
        total_questions=total_q,
        answered_questions=answered_q,
        time_taken_seconds=data.time_taken_seconds,
        answers_json=answers_dump,
        created_at=datetime.datetime.utcnow()
    )
    db.add(history_entry)

    # Recalculate average interview score for profile
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if profile:
        all_past = db.query(InterviewHistory).filter(InterviewHistory.candidate_id == current_user.id).all()
        if all_past:
            avg = sum(h.score for h in all_past) / len(all_past)
            profile.interview_score = round(avg, 1)
        else:
            profile.interview_score = score

    db.commit()
    db.refresh(history_entry)

    return {
        "id": history_entry.id,
        "score": history_entry.score,
        "category": history_entry.category,
        "status": history_entry.status,
        "total_questions": history_entry.total_questions,
        "answered_questions": history_entry.answered_questions,
        "time_taken_seconds": history_entry.time_taken_seconds,
        "created_at": history_entry.created_at.strftime("%Y-%m-%d %H:%M")
    }

def get_candidate_history_service(current_user: User, db: Session) -> list:
    history_records = db.query(InterviewHistory).filter(InterviewHistory.candidate_id == current_user.id).order_by(InterviewHistory.created_at.desc()).all()
    result = []
    for h in history_records:
        result.append({
            "id": h.id,
            "candidate_id": h.candidate_id,
            "candidate_name": current_user.name,
            "category": h.category,
            "target_role": h.target_role,
            "session_type": h.session_type,
            "status": h.status,
            "score": h.score,
            "total_questions": h.total_questions,
            "answered_questions": h.answered_questions,
            "time_taken_seconds": h.time_taken_seconds,
            "answers_json": h.answers_json,
            "created_at": h.created_at.strftime("%Y-%m-%d %H:%M")
        })
    return result

def get_candidate_analytics_service(current_user: User, db: Session) -> dict:
    history = db.query(InterviewHistory).filter(InterviewHistory.candidate_id == current_user.id).order_by(InterviewHistory.created_at.asc()).all()
    completed_count = len(history)
    scores = [h.score for h in history]
    avg_score = round(sum(scores) / completed_count, 1) if completed_count > 0 else 0.0
    
    improvement_pct = 0.0
    if completed_count > 1:
        first_score = scores[0]
        last_score = scores[-1]
        improvement_pct = round(((last_score - first_score) / (first_score if first_score > 0 else 1)) * 100.0, 1)
    
    completion_rate = 100.0 if completed_count > 0 else 0.0

    timeline_data = [
        {"date": h.created_at.strftime("%b %d"), "score": h.score, "category": h.category}
        for h in history
    ]

    return {
        "completed_interviews": completed_count,
        "average_score": avg_score,
        "improvement_percentage": improvement_pct,
        "completion_rate": completion_rate,
        "scores_over_time": timeline_data
    }

def get_candidate_progress_service(current_user: User, db: Session) -> dict:
    history = db.query(InterviewHistory).filter(InterviewHistory.candidate_id == current_user.id).order_by(InterviewHistory.created_at.desc()).all()
    completed_count = len(history)
    avg_score = sum(h.score for h in history) / completed_count if completed_count > 0 else 0.0

    # Determine Level based on deterministic threshold
    if completed_count >= 10 and avg_score >= 85:
        level = "Level 3 - Pro Interviewer"
    elif completed_count >= 3 or avg_score >= 75:
        level = "Level 2 - Experienced Practitioner"
    else:
        level = "Level 1 - Novice Learner"

    badges = []
    if completed_count > 0:
        badges.append({"id": "b1", "name": "First Step", "icon": "fa-solid fa-flag-checkered", "description": "Completed your first mock interview."})
    if any(h.score >= 90 for h in history):
        badges.append({"id": "b2", "name": "High Scorer", "icon": "fa-solid fa-star", "description": "Scored 90%+ in a session."})
    if completed_count >= 5:
        badges.append({"id": "b3", "name": "Consistent Learner", "icon": "fa-solid fa-fire", "description": "Completed 5+ practice rounds."})

    # Calculate skill bar breakdown
    tech_sessions = [h.score for h in history if h.category == "Technical"]
    hr_sessions = [h.score for h in history if h.category == "HR"]
    beh_sessions = [h.score for h in history if h.category == "Behavioral"]

    skill_breakdown = {
        "Technical": round(sum(tech_sessions) / len(tech_sessions), 1) if tech_sessions else 75.0,
        "HR": round(sum(hr_sessions) / len(hr_sessions), 1) if hr_sessions else 85.0,
        "Behavioral": round(sum(beh_sessions) / len(beh_sessions), 1) if beh_sessions else 80.0
    }

    timeline = [
        {
            "title": f"Completed {h.category} Interview",
            "date": h.created_at.strftime("%b %d, %Y %I:%M %p"),
            "score": f"{h.score}%",
            "status": "Verified"
        }
        for h in history[:5]
    ]

    return {
        "current_level": level,
        "completed_interviews": completed_count,
        "average_score": round(avg_score, 1),
        "badges": badges,
        "skill_breakdown": skill_breakdown,
        "activity_timeline": timeline
    }

