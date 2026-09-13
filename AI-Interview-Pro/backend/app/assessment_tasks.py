"""Background enrichment for completed interview reports.

The request that advances or ends an interview stores a deterministic report
immediately. Gemini may then improve the written coaching feedback without
holding the candidate on a "wrapping up" screen.
"""

import uuid

from sqlalchemy.orm import joinedload

from app.config import settings
from app.database import SessionLocal
from app.models import Interview, InterviewAssessment, InterviewQuestion
from app.scoring import (
    analyze_answer,
    apply_answer_quality_guardrails,
    apply_speech_metrics,
    apply_visual_confidence,
    build_interview_assessment,
)


def enrich_completed_assessment(interview_id: str) -> None:
    if not settings.BACKGROUND_AI_FEEDBACK_ENABLED or not settings.GEMINI_API_KEY:
        return

    try:
        interview_uuid = uuid.UUID(str(interview_id))
    except (TypeError, ValueError):
        return

    db = SessionLocal()
    try:
        interview = (
            db.query(Interview)
            .options(
                joinedload(Interview.questions),
                joinedload(Interview.session),
                joinedload(Interview.assessment),
            )
            .filter(Interview.id == interview_uuid)
            .first()
        )
        if not interview:
            return

        data = build_interview_assessment(interview, use_ai_feedback=True)
        if not data:
            return

        assessment = interview.assessment or InterviewAssessment(interview_id=interview.id)
        for key, value in data.items():
            setattr(assessment, key, value)
        interview.overall_score = data["overall_score"]
        db.add(assessment)
        db.commit()
    except Exception:
        # The immediate heuristic report remains valid if enrichment fails.
        db.rollback()
    finally:
        db.close()


def enrich_answer_score(question_id: str) -> None:
    """Replace a fast provisional score with Gemini scoring off the UI path."""
    if not settings.GEMINI_API_KEY:
        return
    try:
        question_uuid = uuid.UUID(str(question_id))
    except (TypeError, ValueError):
        return

    db = SessionLocal()
    try:
        question = (
            db.query(InterviewQuestion)
            .options(
                joinedload(InterviewQuestion.interview).joinedload(Interview.user),
                joinedload(InterviewQuestion.interview).joinedload(Interview.session),
                joinedload(InterviewQuestion.interview).joinedload(Interview.questions),
                joinedload(InterviewQuestion.interview).joinedload(Interview.assessment),
            )
            .filter(InterviewQuestion.id == question_uuid)
            .first()
        )
        if not question or not question.answer_text:
            return

        interview = question.interview
        resume_skills = (
            [skill for skill in (interview.user.resume_skills or "").split(",") if skill]
            if interview.user else None
        )
        scores = analyze_answer(
            question.question_text,
            question.answer_text,
            interview.domain,
            resume_skills,
            question.time_spent_seconds,
            use_ai=True,
        )
        scores = apply_speech_metrics(
            scores,
            question.filler_word_count,
            question.speaking_pace_wpm,
            question.pronunciation_score,
            scores["word_count"],
        )
        if interview.session:
            scores = apply_visual_confidence(scores, interview.session.avg_visual_confidence)
        scores = apply_answer_quality_guardrails(scores, question.question_text, question.answer_text)

        for key in (
            "technical_score", "communication_score", "confidence_score",
            "grammar_score", "professionalism_score", "overall_score",
            "word_count", "scoring_method", "scoring_version", "question_feedback",
        ):
            setattr(question, key, scores[key])

        db.flush()
        if getattr(interview.status, "value", interview.status) == "completed":
            data = build_interview_assessment(interview, use_ai_feedback=True)
            if data:
                assessment = interview.assessment or InterviewAssessment(interview_id=interview.id)
                for key, value in data.items():
                    setattr(assessment, key, value)
                interview.overall_score = data["overall_score"]
                db.add(assessment)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
