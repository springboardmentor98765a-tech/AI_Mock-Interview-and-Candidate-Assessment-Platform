from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.interview import QuestionBankCreate, QuestionBankUpdate, QuestionBankResponse
from services.question_bank_service import QuestionBankService
from security.dependencies import get_current_user, require_role, require_admin

router = APIRouter(prefix="/questions", tags=["Question Bank"])
api_router = APIRouter(prefix="/api/questions", tags=["Question Bank"])

@router.get("", response_model=List[QuestionBankResponse])
@router.get("/", response_model=List[QuestionBankResponse])
@api_router.get("", response_model=List[QuestionBankResponse])
@api_router.get("/", response_model=List[QuestionBankResponse])
def get_questions(
    search: Optional[str] = Query(None, description="Search term in question text or domain"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    category: Optional[str] = Query(None, description="Filter by category"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    keywords: Optional[str] = Query(None, description="Keywords filter"),
    current_user: User = Depends(require_role(["RECRUITER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """View and filter Question Bank entries (Recruiters & Admins Only)."""
    return QuestionBankService.get_questions(
        db=db,
        search=search,
        domain=domain,
        category=category,
        difficulty=difficulty,
        keywords=keywords
    )


@router.post("", response_model=QuestionBankResponse)
@router.post("/", response_model=QuestionBankResponse)
@api_router.post("", response_model=QuestionBankResponse)
@api_router.post("/", response_model=QuestionBankResponse)
def create_question(
    payload: QuestionBankCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new Question Bank entry (Admin Only)."""
    return QuestionBankService.create_question(db, payload)


@router.put("/{question_id}", response_model=QuestionBankResponse)
@api_router.put("/{question_id}", response_model=QuestionBankResponse)
def update_question(
    question_id: int,
    payload: QuestionBankUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update an existing Question Bank entry (Admin Only)."""
    return QuestionBankService.update_question(db, question_id, payload)


@router.delete("/{question_id}")
@api_router.delete("/{question_id}")
def delete_question(
    question_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a Question Bank entry (Admin Only)."""
    res = QuestionBankService.delete_question(db, question_id)
    return {"success": True, "message": res["message"], "data": None, "details": None}
