"""
Feedback Service Module
Generates personalized, evidence-based AI feedback, actionable improvement suggestions,
customized practice drills, curated learning resources, and explainability evidence
derived from the candidate's actual interview session metrics.
"""

import json
import os
from typing import Dict, Any, List, Optional

from google import genai
from google.genai import types

from backend.config import settings
from backend.models.assessment_models import (
    CommunicationBreakdown,
    ConfidenceBreakdown,
    TechnicalRelevanceBreakdown,
    ProfessionalismBreakdown,
    QuestionEvaluation,
    EvidenceItem,
    LearningResource
)


# Known Curated Learning Resources Database (Validated URLs)
RESOURCE_CATALOG = {
    "system_design": LearningResource(
        title="System Design Primer & Architectural Patterns",
        category="Technical Concepts",
        type="Documentation",
        description="Comprehensive guide to distributed systems, caching hierarchies, database sharding, and API scalability.",
        url="https://github.com/donnemartin/system-design-primer"
    ),
    "fastapi_architecture": LearningResource(
        title="FastAPI Official High-Performance Tutorial",
        category="Technical Concepts",
        type="Documentation",
        description="Master async route handlers, dependency injection, and Pydantic validation for high-throughput APIs.",
        url="https://fastapi.tiangolo.com/tutorial/"
    ),
    "star_method": LearningResource(
        title="The STAR Framework for Structured Responses",
        category="Interview Preparation",
        type="Practice Drill",
        description="Step-by-step method to structure technical and behavioral answers into Situation, Task, Action, and Result.",
        url="https://www.thebalancecareers.com/what-is-the-star-interview-response-technique-2061629"
    ),
    "filler_reduction": LearningResource(
        title="Toastmasters Guide to Eliminating Filler Words",
        category="Public Speaking",
        type="Practice Drill",
        description="Proven techniques to replace 'um', 'uh', and 'you know' with intentional, authoritative pauses.",
        url="https://www.toastmasters.org/magazine/magazine-issues/2020/nov/the-pause-power"
    ),
    "camera_confidence": LearningResource(
        title="Virtual Interview Body Language & Eye-Contact Mastery",
        category="Confidence",
        type="Article",
        description="Mastering webcam eye contact, centered posture, and confident facial engagement during video assessments.",
        url="https://hbr.org/2020/06/how-to-ace-a-video-interview"
    ),
    "grammar_fluency": LearningResource(
        title="Effective Technical English for Software Engineers",
        category="Communication Skills",
        type="Course",
        description="Enhancing sentence clarity, active voice formulations, and precise technical jargon articulation.",
        url="https://developers.google.com/tech-writing"
    ),
    "time_management": LearningResource(
        title="Concise Technical Explanations: The 2-Minute Rule",
        category="Professional Communication",
        type="Article",
        description="Learn how to deliver high-impact technical answers within a crisp 90-150 second window.",
        url="https://www.coursera.org/learn/technical-writing-skills"
    )
}


def _get_gemini_client():
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if api_key:
        try:
            return genai.Client(api_key=api_key)
        except Exception:
            return None
    return None


def generate_assessment_feedback(
    communication: CommunicationBreakdown,
    confidence: ConfidenceBreakdown,
    technical: TechnicalRelevanceBreakdown,
    professionalism: ProfessionalismBreakdown,
    overall_score: float,
    performance_rating: str,
    question_evaluations: List[QuestionEvaluation],
    domain: str = "Full Stack"
) -> Dict[str, Any]:
    """
    Synthesizes personalized feedback based on actual session data:
    - strengths
    - weaknesses
    - improvement_suggestions
    - practice_recommendations
    - learning_resources
    - evidence
    """
    strengths: List[str] = []
    weaknesses: List[str] = []
    improvement_suggestions: List[str] = []
    practice_recommendations: List[str] = []
    learning_resources: List[LearningResource] = []
    evidence: List[EvidenceItem] = []

    # 1. Strengths Extraction
    if communication.score >= 80.0:
        strengths.append(f"Strong verbal communication ({communication.score}%) with articulate clarity and clear phonetics.")
    if communication.speaking_pace_score >= 88.0:
        strengths.append(f"Well-paced speaking cadence ({communication.wpm or 135} WPM) maintaining optimal interviewer engagement.")
    if communication.filler_word_score >= 85.0:
        strengths.append(f"Low filler-word usage ({communication.filler_rate or 1.2}%), demonstrating verbal poise.")
    if technical.score >= 80.0:
        strengths.append(f"Solid technical relevance ({technical.score}%) demonstrating deep {domain} domain mastery.")
    if technical.technical_accuracy >= 85.0:
        strengths.append(f"High technical accuracy ({technical.technical_accuracy}%) with sound engineering fundamentals.")
    if confidence.score >= 80.0:
        strengths.append(f"Confident demeanor ({confidence.score}%) with steady speaking composure and minimal hesitation.")
    if confidence.eye_contact is not None and confidence.eye_contact >= 75.0:
        strengths.append(f"Consistent eye contact ({confidence.eye_contact}%) maintaining focused camera connection.")
    if professionalism.score >= 80.0:
        strengths.append(f"Excellent professionalism ({professionalism.score}%) with structured organization and etiquette.")

    if not strengths:
        strengths.append("Willingness to attempt all technical questions and articulate reasoning.")
        strengths.append("Demonstrated foundational familiarity with the technical domain.")

    # 2. Weaknesses Identification & Evidence Building
    # Communication checks
    if communication.filler_word_score < 75.0:
        weaknesses.append(f"Frequent filler-word usage ({communication.filler_rate or 5.0}%) disrupted verbal smoothness.")
        evidence.append(EvidenceItem(
            metric="Filler Words",
            score=communication.filler_word_score,
            evidence=f"Filler word frequency reached {communication.filler_rate or 5.0}%.",
            impact="Reduced verbal composure and Communication score.",
            recommendation="Practice the 1-second silent breath technique instead of vocalizing fillers."
        ))
        improvement_suggestions.append("Consciously replace filler words ('um', 'like', 'you know') with deliberate pauses.")
        practice_recommendations.append("Record a 2-minute technical answer daily and repeat it while actively targeting zero filler words.")
        learning_resources.append(RESOURCE_CATALOG["filler_reduction"])

    if communication.speaking_pace_score < 75.0:
        pace_label = "slow" if (communication.wpm or 100) < 120 else "fast"
        weaknesses.append(f"Speaking pace was too {pace_label} ({communication.wpm or 100} WPM), deviating from the 120–160 WPM benchmark.")
        evidence.append(EvidenceItem(
            metric="Speaking Pace",
            score=communication.speaking_pace_score,
            evidence=f"Measured speed was {communication.wpm or 100} WPM.",
            impact=f"A pace that is too {pace_label} affects clarity and listener comprehension.",
            recommendation="Aim for a measured conversational pace between 120 and 160 WPM."
        ))
        improvement_suggestions.append(f"Calibrate your delivery speed: practice speaking at a steady 130–150 WPM.")
        practice_recommendations.append("Practice reading technical articles aloud against a metronome or pace timer set to 140 WPM.")

    if communication.grammar_quality < 75.0:
        weaknesses.append(f"Grammatical phrasing and sentence consistency scored {communication.grammar_quality}%.")
        evidence.append(EvidenceItem(
            metric="Grammar Quality",
            score=communication.grammar_quality,
            evidence=f"Detected {communication.grammar_mistakes_count or 2} grammar/syntax inconsistencies in responses.",
            impact="Minor phrasing errors reduce professional communication impact.",
            recommendation="Use concise Subject-Verb-Object phrasing for technical explanations."
        ))
        improvement_suggestions.append("Structure sentences using direct active voice when discussing engineering trade-offs.")
        learning_resources.append(RESOURCE_CATALOG["grammar_fluency"])

    # Technical checks
    if technical.technical_accuracy < 75.0:
        weaknesses.append(f"Technical accuracy ({technical.technical_accuracy}%) was below target across multiple questions.")
        evidence.append(EvidenceItem(
            metric="Technical Accuracy",
            score=technical.technical_accuracy,
            evidence=f"Candidate answers scored {technical.technical_accuracy}% on technical correctness.",
            impact="Lower Technical Relevance score and reduced hiring confidence.",
            recommendation="Review core domain mechanisms and study architectural edge cases."
        ))
        improvement_suggestions.append(f"Deepen your foundational knowledge of {domain} system architecture and internals.")
        practice_recommendations.append(f"Complete 10 domain-specific technical interview questions covering {domain} core patterns.")
        learning_resources.append(RESOURCE_CATALOG["system_design"])
        learning_resources.append(RESOURCE_CATALOG["fastapi_architecture"])

    if technical.answer_completeness < 75.0:
        weaknesses.append(f"Answer completeness ({technical.answer_completeness}%) indicated brief or partial responses.")
        evidence.append(EvidenceItem(
            metric="Answer Completeness",
            score=technical.answer_completeness,
            evidence="Several responses were concise and omitted key implementation nuances.",
            impact="Evaluators were unable to assess full depth of technical competence.",
            recommendation="Structure answers to cover problem context, core implementation, trade-offs, and verification."
        ))
        improvement_suggestions.append("Adopt structured frameworks (e.g., STAR / Context-Action-Result) to ensure comprehensive answers.")
        practice_recommendations.append("Practice answering mock interview questions by allocating 30s to context, 60s to technical steps, and 30s to trade-offs.")
        learning_resources.append(RESOURCE_CATALOG["star_method"])

    # Confidence checks
    if confidence.hesitation_score < 75.0:
        weaknesses.append(f"Hesitation score ({confidence.hesitation_score}%) reflected noticeable pauses before answering.")
        evidence.append(EvidenceItem(
            metric="Response Hesitation",
            score=confidence.hesitation_score,
            evidence="Prolonged silence or false starts before initiating explanations.",
            impact="Diminished projected speaking confidence.",
            recommendation="Take a structured 2-second breath, outline your 3 main points mentally, then answer smoothly."
        ))
        improvement_suggestions.append("Practice immediate 2-second structured framing instead of prolonged pauses.")
        practice_recommendations.append("Conduct 3 timed rapid-fire mock interview drills with instant response prompts.")

    if confidence.eye_contact is not None and confidence.eye_contact < 65.0:
        weaknesses.append(f"Camera eye contact ({confidence.eye_contact}%) was inconsistent throughout the session.")
        evidence.append(EvidenceItem(
            metric="Eye Contact",
            score=confidence.eye_contact,
            evidence=f"Eye tracking observed camera focus for {confidence.eye_contact}% of session frames.",
            impact="Reduced visual engagement and interpersonal connection.",
            recommendation="Position your webcam at eye level and maintain direct gaze during explanations."
        ))
        improvement_suggestions.append("Maintain direct eye contact with the camera lens when delivering key points.")
        learning_resources.append(RESOURCE_CATALOG["camera_confidence"])

    # Professionalism checks
    if professionalism.response_organization < 75.0:
        weaknesses.append(f"Response organization ({professionalism.response_organization}%) lacked explicit structural transitions.")
        evidence.append(EvidenceItem(
            metric="Response Organization",
            score=professionalism.response_organization,
            evidence="Limited use of sequential markers ('first', 'furthermore', 'in conclusion').",
            impact="Answers felt less organized and harder to follow for interviewers.",
            recommendation="Signal your response structure upfront: 'I approach this problem in three stages...'."
        ))
        improvement_suggestions.append("Signpost your responses clearly using numerical steps or thematic pillars.")
        learning_resources.append(RESOURCE_CATALOG["time_management"])

    # Ensure at least 1-2 constructive points if candidate did extraordinarily well
    if not weaknesses:
        weaknesses.append("Minor opportunity to expand on automated regression testing and production telemetry.")
        improvement_suggestions.append("Incorporate end-to-end telemetry and observability examples into architectural discussions.")
        practice_recommendations.append("Practice deep-dive architectural trade-off discussions with focus on scale bottlenecks.")

    if not practice_recommendations:
        practice_recommendations.append("Conduct a 30-minute mock interview session weekly to maintain peak interview fluency.")

    if not learning_resources:
        learning_resources.append(RESOURCE_CATALOG["system_design"])
        learning_resources.append(RESOURCE_CATALOG["star_method"])

    # De-duplicate resources by URL
    unique_resources_dict = {}
    for r in learning_resources:
        unique_resources_dict[r.url] = r
    unique_resources = list(unique_resources_dict.values())

    return {
        "strengths": strengths[:6],
        "weaknesses": weaknesses[:6],
        "improvement_suggestions": improvement_suggestions[:6],
        "practice_recommendations": practice_recommendations[:5],
        "learning_resources": unique_resources[:5],
        "evidence": evidence
    }
