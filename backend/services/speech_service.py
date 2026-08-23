import re
import json
import logging
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from models.interview import SpeechAnalysis, InterviewSession, InterviewQuestion
from models.user import User
from services.ai_service import GeminiService

logger = logging.getLogger("speech_service")

# Configurable filler words list (word-boundary aware)
DEFAULT_FILLER_WORDS = [
    "um", "uh", "like", "you know", "actually", "basically", "so", "well", "i mean"
]

def analyze_filler_words(text: str, custom_fillers: Optional[List[str]] = None) -> Dict[str, Any]:
    """Detects filler words in transcript using word-boundary aware matching."""
    fillers = custom_fillers or DEFAULT_FILLER_WORDS
    text_lower = text.lower() if text else ""

    detected_counts = {}
    total_fillers = 0

    for filler in fillers:
        pattern = r'\b' + re.escape(filler.lower()) + r'\b'
        matches = re.findall(pattern, text_lower)
        count = len(matches)
        if count > 0:
            detected_counts[filler] = count
            total_fillers += count

    words = re.findall(r'\b\w+\b', text_lower)
    word_count = len(words)
    filler_rate = round((total_fillers / word_count * 100.0), 1) if word_count > 0 else 0.0

    return {
        "filler_word_count": total_fillers,
        "filler_words": detected_counts,
        "filler_rate_percent": filler_rate,
        "word_count": word_count
    }


def calculate_speech_pace(word_count: int, duration_seconds: float) -> Dict[str, Any]:
    """Calculates WPM and classifies speaking pace."""
    if duration_seconds <= 0 or word_count <= 0:
        return {
            "words_per_minute": 0.0,
            "classification": "No Speech Detected",
            "pace_score": 50.0
        }

    duration_minutes = duration_seconds / 60.0
    wpm = round(word_count / duration_minutes, 1)

    if wpm < 100:
        classification = "Too Slow"
        score = 65.0
    elif 100 <= wpm <= 119:
        classification = "Slow"
        score = 80.0
    elif 120 <= wpm <= 160:
        classification = "Good"
        score = 95.0
    elif 161 <= wpm <= 180:
        classification = "Fast"
        score = 80.0
    else:
        classification = "Too Fast"
        score = 65.0

    return {
        "words_per_minute": wpm,
        "classification": classification,
        "pace_score": score
    }


def evaluate_local_grammar(text: str) -> Dict[str, Any]:
    """Rule-based local grammar and syntax quality analyzer."""
    if not text or not text.strip():
        return {
            "score": 0.0,
            "issues": ["No transcript available to analyze."],
            "feedback": "No spoken response detected for grammar analysis."
        }

    issues = []
    text_clean = text.strip()
    words = re.findall(r'\b\w+\b', text_clean)
    word_count = len(words)

    if word_count < 4:
        issues.append("Sentence fragment detected (very short response).")

    # Check repeated adjacent words
    repeated = re.findall(r'\b(\w+)\s+\1\b', text_clean, re.IGNORECASE)
    if repeated:
        unique_rep = list(set(repeated))
        issues.append(f"Repeated words detected: {', '.join(unique_rep)}.")

    # Check capitalization at start of sentences
    sentences = [s.strip() for s in re.split(r'[.!?]+', text_clean) if s.strip()]
    if sentences:
        uncap = [s for s in sentences if not s[0].isupper()]
        if len(uncap) > len(sentences) / 2:
            issues.append("Consider starting complete sentences with proper capitalization.")

    # Base grammar score
    if word_count >= 15 and len(issues) == 0:
        base_score = 92.0
    elif word_count >= 8 and len(issues) <= 1:
        base_score = 84.0
    elif word_count >= 4:
        base_score = 75.0
    else:
        base_score = 55.0

    feedback_text = (
        "Grammar structure is strong and clear." if base_score >= 85
        else "Grammar is generally good. " + " ".join(issues) if issues
        else "Consider forming complete, structured sentences."
    )

    return {
        "score": base_score,
        "issues": issues,
        "feedback": feedback_text
    }


def run_full_communication_analysis(
    transcript: str,
    duration_seconds: float,
    recognition_confidence: Optional[float] = None
) -> Dict[str, Any]:
    """
    Performs comprehensive Module 5 communication analysis using real measurements.
    Strictly sets pronunciation_score = None when phoneme analysis is unavailable.
    Normalizes weights across available active metrics.
    """
    filler_res = analyze_filler_words(transcript)
    word_count = filler_res["word_count"]
    filler_count = filler_res["filler_word_count"]
    filler_rate = filler_res["filler_rate_percent"]

    pace_res = calculate_speech_pace(word_count, duration_seconds)
    wpm = pace_res["words_per_minute"]
    pace_score = pace_res["pace_score"]

    # Filler score
    if filler_rate <= 2.0:
        filler_score = 95.0
    elif filler_rate <= 5.0:
        filler_score = 85.0
    elif filler_rate <= 8.0:
        filler_score = 75.0
    else:
        filler_score = 60.0

    # Local grammar analysis
    grammar_res = evaluate_local_grammar(transcript)
    grammar_score = grammar_res["score"]

    # Clarity score based on recognition clarity / word length ratio
    if word_count > 0:
        if recognition_confidence is not None and 0.0 <= recognition_confidence <= 1.0:
            clarity_score = round(recognition_confidence * 100.0, 1)
        else:
            clarity_score = 90.0 if word_count >= 10 else (80.0 if word_count >= 4 else 60.0)
    else:
        clarity_score = 0.0

    # Pronunciation score is strictly set to None when phoneme assessment is unavailable (Rule 1 & 17)
    pronunciation_score = None

    # Weighted communication score calculation across active/available metrics (Rule 19)
    # Active metrics: Grammar (30%), Filler Control (25%), Speech Pace (25%), Clarity (20%)
    weighted_sum = (grammar_score * 0.30) + (filler_score * 0.25) + (pace_score * 0.25) + (clarity_score * 0.20)
    overall_communication = round(weighted_sum, 1)

    feedback_data = {
        "grammar_feedback": grammar_res["feedback"],
        "grammar_issues": grammar_res["issues"],
        "speech_pace_classification": pace_res["classification"],
        "speech_pace_wpm": wpm,
        "filler_rate_percent": filler_rate,
        "filler_words_breakdown": filler_res["filler_words"],
        "pronunciation_notice": "Pronunciation evaluation unavailable for this browser/session.",
        "improvement_suggestions": [
            f"Speech pace is currently {pace_res['classification'].lower()} ({wpm} WPM). Target 120-160 WPM for optimal clarity."
            if pace_res["classification"] != "Good" else "Speech pace is in the optimal range (120-160 WPM).",
            f"Detected {filler_count} filler word(s) ({filler_rate}% rate). Try pausing briefly instead of using filler words."
            if filler_count > 0 else "Excellent filler word control.",
            grammar_res["feedback"]
        ]
    }

    return {
        "transcript": transcript,
        "word_count": word_count,
        "duration_seconds": duration_seconds,
        "words_per_minute": wpm,
        "filler_word_count": filler_count,
        "filler_words": filler_res["filler_words"],
        "grammar_score": grammar_score,
        "pronunciation_score": pronunciation_score,  # null
        "clarity_score": clarity_score,
        "communication_score": overall_communication,
        "feedback": feedback_data
    }


def save_or_update_speech_analysis(
    db: Session,
    session_id: int,
    candidate_id: int,
    question_id: Optional[int],
    transcript: str,
    duration_seconds: float,
    confidence: Optional[float] = None
) -> SpeechAnalysis:
    """Persists or updates SpeechAnalysis record for session question attempt."""
    analysis = run_full_communication_analysis(transcript, duration_seconds, confidence)

    record = None
    if question_id:
        record = db.query(SpeechAnalysis).filter(
            SpeechAnalysis.session_id == session_id,
            SpeechAnalysis.question_id == question_id
        ).first()

    if not record:
        record = SpeechAnalysis(
            session_id=session_id,
            question_id=question_id,
            candidate_id=candidate_id,
            transcript=transcript,
            word_count=analysis["word_count"],
            duration_seconds=duration_seconds,
            words_per_minute=analysis["words_per_minute"],
            filler_word_count=analysis["filler_word_count"],
            filler_words=analysis["filler_words"],
            grammar_score=analysis["grammar_score"],
            pronunciation_score=analysis["pronunciation_score"],  # None
            clarity_score=analysis["clarity_score"],
            communication_score=analysis["communication_score"],
            feedback=analysis["feedback"]
        )
        db.add(record)
    else:
        record.transcript = transcript
        record.word_count = analysis["word_count"]
        record.duration_seconds = duration_seconds
        record.words_per_minute = analysis["words_per_minute"]
        record.filler_word_count = analysis["filler_word_count"]
        record.filler_words = analysis["filler_words"]
        record.grammar_score = analysis["grammar_score"]
        record.pronunciation_score = analysis["pronunciation_score"]
        record.clarity_score = analysis["clarity_score"]
        record.communication_score = analysis["communication_score"]
        record.feedback = analysis["feedback"]

    db.commit()
    db.refresh(record)
    return record
