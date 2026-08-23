from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.interview import InterviewSession, SpeechAnalysis
from security.dependencies import get_current_user
from services.speech_service import (
    save_or_update_speech_analysis,
    run_full_communication_analysis,
    analyze_filler_words,
    calculate_speech_pace
)

router = APIRouter(prefix="/api/interview/speech", tags=["Speech & Communication Analysis"])

class SpeechTranscriptionRequest(BaseModel):
    session_id: int
    question_id: Optional[int] = None
    transcript: str
    duration_seconds: float = 0.0
    confidence: Optional[float] = None

class SpeechAnalyzeRequest(BaseModel):
    session_id: int
    question_id: Optional[int] = None
    transcript: str
    duration_seconds: float = 0.0
    confidence: Optional[float] = None

@router.post("/transcription")
def record_speech_transcription(
    payload: SpeechTranscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save or update speech transcript and run communication analysis for session attempt."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == payload.session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this session.")

    analysis_rec = save_or_update_speech_analysis(
        db=db,
        session_id=payload.session_id,
        candidate_id=session_rec.candidate_id,
        question_id=payload.question_id,
        transcript=payload.transcript,
        duration_seconds=payload.duration_seconds,
        confidence=payload.confidence
    )

    return {
        "success": True,
        "message": "Speech transcription and communication analysis saved.",
        "data": {
            "id": analysis_rec.id,
            "session_id": analysis_rec.session_id,
            "question_id": analysis_rec.question_id,
            "transcript": analysis_rec.transcript,
            "word_count": analysis_rec.word_count,
            "duration_seconds": analysis_rec.duration_seconds,
            "words_per_minute": analysis_rec.words_per_minute,
            "filler_word_count": analysis_rec.filler_word_count,
            "filler_words": analysis_rec.filler_words or {},
            "grammar_score": analysis_rec.grammar_score,
            "pronunciation_score": analysis_rec.pronunciation_score,  # null
            "clarity_score": analysis_rec.clarity_score,
            "communication_score": analysis_rec.communication_score,
            "feedback": analysis_rec.feedback or {}
        }
    }


@router.post("/analyze")
def analyze_speech_content(
    payload: SpeechAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Runs immediate communication analysis on transcript text."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == payload.session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this session.")

    analysis = run_full_communication_analysis(
        transcript=payload.transcript,
        duration_seconds=payload.duration_seconds,
        recognition_confidence=payload.confidence
    )

    return {
        "success": True,
        "data": analysis
    }


@router.get("/{session_id}")
def get_session_speech_analysis(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches all stored Module 5 communication analysis records for an interview session."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this session.")

    records = db.query(SpeechAnalysis).filter(SpeechAnalysis.session_id == session_id).all()

    items = []
    total_words = 0
    total_duration = 0.0
    total_fillers = 0
    grammar_scores = []
    clarity_scores = []
    comm_scores = []

    for r in records:
        total_words += r.word_count or 0
        total_duration += r.duration_seconds or 0.0
        total_fillers += r.filler_word_count or 0
        if r.grammar_score: grammar_scores.append(r.grammar_score)
        if r.clarity_score: clarity_scores.append(r.clarity_score)
        if r.communication_score: comm_scores.append(r.communication_score)

        items.append({
            "id": r.id,
            "question_id": r.question_id,
            "transcript": r.transcript,
            "word_count": r.word_count,
            "duration_seconds": r.duration_seconds,
            "words_per_minute": r.words_per_minute,
            "filler_word_count": r.filler_word_count,
            "filler_words": r.filler_words or {},
            "grammar_score": r.grammar_score,
            "pronunciation_score": r.pronunciation_score,  # null
            "clarity_score": r.clarity_score,
            "communication_score": r.communication_score,
            "feedback": r.feedback or {},
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else None
        })

    avg_grammar = round(sum(grammar_scores) / len(grammar_scores), 1) if grammar_scores else 0.0
    avg_clarity = round(sum(clarity_scores) / len(clarity_scores), 1) if clarity_scores else 0.0
    avg_comm = round(sum(comm_scores) / len(comm_scores), 1) if comm_scores else 0.0
    overall_wpm = round(total_words / (total_duration / 60.0), 1) if total_duration > 0 else 0.0

    return {
        "success": True,
        "summary": {
            "session_id": session_id,
            "total_questions_analyzed": len(items),
            "total_words_spoken": total_words,
            "total_duration_seconds": total_duration,
            "overall_words_per_minute": overall_wpm,
            "total_filler_words": total_fillers,
            "average_grammar_score": avg_grammar,
            "pronunciation_score": None,  # null per spec
            "average_clarity_score": avg_clarity,
            "overall_communication_score": avg_comm,
            "pronunciation_notice": "Pronunciation evaluation unavailable for this browser/session."
        },
        "details": items
    }
