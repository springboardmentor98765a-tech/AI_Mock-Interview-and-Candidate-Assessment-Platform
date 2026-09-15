import re
from typing import Dict, Any
from backend.config import settings
from backend.models.speech_models import PaceAnalysisResult

def calculate_speech_pace(word_count: int, duration_seconds: float) -> PaceAnalysisResult:
    """
    Calculates Words Per Minute (WPM), categorizes pace, and generates actionable recommendations.
    """
    duration = max(1.0, float(duration_seconds))
    duration_minutes = duration / 60.0
    wpm = round(word_count / duration_minutes, 1)

    thresholds = settings.PACE_THRESHOLDS
    category = "Normal"
    recommendation = "Excellent speaking pace! 120–160 WPM is the ideal conversational tempo for professional technical interviews."

    if wpm < thresholds["very_slow"]["max"]:
        category = "Very Slow"
        recommendation = "Your speaking pace is quite slow (<100 WPM). Try practicing with a more fluent and continuous delivery to maintain listener engagement."
    elif wpm <= thresholds["slow"]["max"]:
        category = "Slow"
        recommendation = "Your speaking pace is slightly slow (100–119 WPM). Increasing your tempo slightly will help convey enthusiasm and confidence."
    elif wpm <= thresholds["normal"]["max"]:
        category = "Normal"
        recommendation = "Optimal pacing! You maintained a clear, professional speaking pace (120–160 WPM) that is easy to follow."
    elif wpm <= thresholds["fast"]["max"]:
        category = "Fast"
        recommendation = "Your speaking pace is slightly fast (161–180 WPM). Try pausing briefly after concluding key points to let the interviewer absorb your ideas."
    else:
        category = "Very Fast"
        recommendation = "Your speaking pace is very fast (>180 WPM). Be mindful of slowing down and articulating each technical concept clearly."

    return PaceAnalysisResult(
        speaking_duration_seconds=round(duration, 1),
        word_count=word_count,
        wpm=wpm,
        category=category,
        recommendation=recommendation
    )

def count_transcript_words(transcript: str) -> int:
    if not transcript:
        return 0
    return len(re.findall(r'\b[\w\'-]+\b', transcript))

def count_transcript_sentences(transcript: str) -> int:
    if not transcript:
        return 0
    sentences = re.split(r'[.!?]+', transcript)
    return len([s for s in sentences if s.strip()])
