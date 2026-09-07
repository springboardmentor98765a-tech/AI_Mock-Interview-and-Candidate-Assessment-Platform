import json
import re
import os
from typing import Dict, Any, List
from google import genai
from google.genai import types
from backend.config import settings
from backend.models.speech_models import (
    CommunicationScoreBreakdown,
    AIFeedbackResult,
    GrammarAnalysisResult,
    FillerAnalysisResult,
    PaceAnalysisResult,
    PauseAnalysisResult,
    PronunciationAnalysisResult
)

def _get_gemini_client():
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if api_key:
        return genai.Client(api_key=api_key)
    return None

def compute_communication_score(
    grammar: GrammarAnalysisResult,
    fillers: FillerAnalysisResult,
    pace: PaceAnalysisResult,
    pauses: PauseAnalysisResult,
    pronunciation: PronunciationAnalysisResult,
    transcript: str
) -> CommunicationScoreBreakdown:
    """
    Computes deterministic component scores and overall communication score using configurable weights.
    """
    # 1. Grammar Score (0-100)
    grammar_score = grammar.score

    # 2. Fluency Score (0-100)
    # Deduct for high filler rate and excessive silence
    filler_penalty = min(40.0, fillers.rate * 4.0)
    silence_penalty = min(20.0, (pauses.silence_percentage / 100.0) * 30.0)
    fluency_score = max(40, int(round(100.0 - filler_penalty - silence_penalty)))

    # 3. Pronunciation Score (0-100)
    pronunciation_score = pronunciation.score

    # 4. Pace Score (0-100)
    # 120-160 is optimal (100). Penalize deviations linearly.
    wpm = pace.wpm
    if 120 <= wpm <= 160:
        pace_score = 98
    elif 100 <= wpm < 120:
        pace_score = int(85 + ((wpm - 100) / 20) * 10)
    elif 160 < wpm <= 180:
        pace_score = int(85 + ((180 - wpm) / 20) * 10)
    elif wpm < 100:
        pace_score = max(50, int(50 + (wpm / 100) * 35))
    else:  # wpm > 180
        pace_score = max(50, int(85 - min(35, (wpm - 180) * 0.8)))

    # 5. Clarity Score (0-100)
    # Combines sentence structure, grammar correctness, and pause balance
    clarity_score = int(round((grammar_score * 0.5) + (fluency_score * 0.3) + (pronunciation_score * 0.2)))

    # 6. Vocabulary Quality (0-100)
    words = re.findall(r'\b[a-zA-Z]{3,}\b', transcript.lower())
    unique_words = set(words)
    ttr = (len(unique_words) / len(words)) if words else 1.0  # Type-Token Ratio
    vocabulary_score = max(55, min(98, int(60 + ttr * 35)))

    # 7. Confidence Indicator Score (0-100)
    # Based on smooth pace, low hesitation fillers, and minimal long pauses
    hesitation_penalty = min(30, fillers.total * 3)
    long_pause_penalty = min(20, pauses.long_pauses * 6)
    confidence_score = max(50, int(round(95 - hesitation_penalty - long_pause_penalty)))

    # Compute overall weighted score
    weights = settings.COMMUNICATION_WEIGHTS
    weighted_sum = (
        grammar_score * weights["grammar"] +
        fluency_score * weights["fluency"] +
        pronunciation_score * weights["pronunciation"] +
        pace_score * weights["pace"] +
        clarity_score * weights["clarity"] +
        vocabulary_score * weights["vocabulary"] +
        confidence_score * weights["confidence"]
    )
    overall = max(0, min(100, int(round(weighted_sum))))

    return CommunicationScoreBreakdown(
        overall_score=overall,
        grammar=grammar_score,
        fluency=fluency_score,
        pronunciation=pronunciation_score,
        pace=pace_score,
        clarity=clarity_score,
        vocabulary=vocabulary_score,
        confidence=confidence_score
    )

def generate_ai_communication_feedback(
    transcript: str,
    scores: CommunicationScoreBreakdown,
    grammar: GrammarAnalysisResult,
    fillers: FillerAnalysisResult,
    pace: PaceAnalysisResult,
    pauses: PauseAnalysisResult
) -> AIFeedbackResult:
    """
    Generates personalized, actionable AI feedback based on actual analysis results.
    """
    client = _get_gemini_client()
    
    if client:
        try:
            summary = {
                "overall_score": scores.overall_score,
                "scores_breakdown": scores.model_dump(),
                "wpm": pace.wpm,
                "pace_category": pace.category,
                "filler_rate": fillers.rate,
                "most_used_filler": fillers.most_used,
                "grammar_mistakes_count": grammar.mistakes_count,
                "silence_pct": pauses.silence_percentage
            }
            prompt = f"""
            You are a Senior Executive Speech & Communication Coach for technical interviews.
            Based on the candidate's actual speech analytics data below, synthesize personalized, constructive feedback.

            Analytics Data:
            {json.dumps(summary, indent=2)}

            Transcript:
            \"\"\"{transcript[:2000]}\"\"\"

            Return ONLY valid JSON matching this schema:
            {{
                "strengths": [
                    "Specific strength 1 with technical communication praise",
                    "Specific strength 2"
                ],
                "improvements": [
                    "Specific area 1 requiring refinement",
                    "Specific area 2"
                ],
                "recommendations": [
                    "Actionable practice drill 1",
                    "Actionable practice drill 2",
                    "Actionable practice drill 3"
                ]
            }}
            """

            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )

            if response.text:
                data = json.loads(response.text.strip())
                return AIFeedbackResult(
                    strengths=data.get("strengths", []),
                    improvements=data.get("improvements", []),
                    recommendations=data.get("recommendations", [])
                )
        except Exception as e:
            print(f"[Communication Service] Gemini feedback generation error: {e}")

    # Deterministic personalized feedback generator
    strengths = []
    improvements = []
    recommendations = []

    # Pace feedback
    if 120 <= pace.wpm <= 160:
        strengths.append(f"Optimal speaking pace of {pace.wpm} WPM kept your answer clear and engaging.")
    elif pace.wpm < 120:
        improvements.append(f"Speaking pace ({pace.wpm} WPM) is on the slower side. Increasing momentum will project greater energy.")
        recommendations.append("Practice reading technical case studies aloud aiming for a target tempo of 130–150 WPM.")
    else:
        improvements.append(f"Fast speaking speed ({pace.wpm} WPM). Slowing down ensures complex technical nuances are absorbed.")
        recommendations.append("Introduce intentional 1-second pauses when transitioning between architectural concepts.")

    # Filler feedback
    if fillers.rate <= 2.5:
        strengths.append(f"Low filler-word rate ({fillers.rate}%) demonstrated strong verbal composure.")
    else:
        most_used_phrase = f"'{fillers.most_used}'" if fillers.most_used else "filler words"
        improvements.append(f"High filler-word usage ({fillers.rate}%), frequently relying on {most_used_phrase}.")
        recommendations.append(f"Try the 'Pause Instead of Filler' technique: replace {most_used_phrase} with a silent breath.")

    # Grammar feedback
    if grammar.score >= 85:
        strengths.append("Strong grammatical accuracy with well-structured sentence formulations.")
    else:
        improvements.append(f"Detected {grammar.mistakes_count} grammatical/phrasing inconsistencies.")
        recommendations.append("Use direct Subject-Verb-Object active phrasing when explaining system tradeoffs.")

    if not strengths:
        strengths.append("Clear vocal projection and willingness to articulate comprehensive explanations.")

    recommendations.append("Record 2-minute mock answers daily and track your WPM and filler reduction metrics.")

    return AIFeedbackResult(
        strengths=strengths,
        improvements=improvements,
        recommendations=recommendations
    )
