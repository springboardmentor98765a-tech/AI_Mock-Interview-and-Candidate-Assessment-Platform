"""
Module 1 — Recruiter "Create interview templates".

A template is just a named preset for the fields already on
POST /interviews/generate (interview type/category/domain/difficulty/
question count/mode). Selecting one in the candidate UI pre-fills that
form — it does not change how interviews are generated, scored, or
stored. Kept deliberately thin so it can't destabilize the existing,
working interview-generation flow.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import InterviewTemplate, User
from app.schemas import InterviewTemplateIn, InterviewTemplateOut
from app.security import CurrentUser, get_current_user, require_roles

STAFF_ROLES = ("coach", "recruiter", "admin")

router = APIRouter(prefix="/api/interviews/templates", tags=["interview-templates"])


def _to_out(t: InterviewTemplate, creator_name: str | None) -> InterviewTemplateOut:
    return InterviewTemplateOut(
        id=t.id,
        name=t.name,
        interviewType=t.interview_type,
        category=t.category,
        domain=t.domain,
        difficulty=t.difficulty,
        questionCount=t.question_count,
        mode=t.mode,
        createdByName=creator_name,
        createdAt=t.created_at,
    )


@router.get("", response_model=list[InterviewTemplateOut])
def list_templates(db: Session = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    """Any authenticated user can list templates — candidates are the
    ones who actually pick one when starting a mock interview."""
    rows = db.query(InterviewTemplate, User).outerjoin(User, User.id == InterviewTemplate.created_by).order_by(
        InterviewTemplate.created_at.desc()
    ).all()
    return [_to_out(t, u.full_name if u else None) for t, u in rows]


@router.post("", response_model=InterviewTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    body: InterviewTemplateIn,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
):
    if not body.name.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Template name is required")
    if body.questionCount < 1 or body.questionCount > 20:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Question count must be between 1 and 20")

    template = InterviewTemplate(
        created_by=user.id,
        name=body.name.strip(),
        interview_type=body.interviewType,
        category=body.category,
        domain=body.domain,
        difficulty=body.difficulty,
        question_count=body.questionCount,
        mode=body.mode,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _to_out(template, user.full_name)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
):
    template = db.get(InterviewTemplate, template_id)
    if template is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    if template.created_by != user.id and user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only delete templates you created")
    db.delete(template)
    db.commit()
