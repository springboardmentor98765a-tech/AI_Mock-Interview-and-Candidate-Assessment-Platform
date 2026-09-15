"""
Assessment Data Models
Defines Pydantic models for the AI Feedback & Scoring Module, including
category breakdowns, sub-metrics, question-level evaluations, explainable evidence,
and the persistent Assessment entity.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class SubMetricDetail(BaseModel):
    name: str
    score: Optional[float] = None
    weight: float
    status: str = "available"  # "available", "unavailable", "estimated"
    description: str = ""
    evidence: str = ""
    observation: str = ""


class CommunicationBreakdown(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0, description="Overall Communication Score (30% weight)")
    weight: float = 0.30
    speech_clarity: float = Field(..., ge=0.0, le=100.0, description="Speech Clarity (25% weight)")
    grammar_quality: float = Field(..., ge=0.0, le=100.0, description="Grammar Quality (20% weight)")
    filler_word_score: float = Field(..., ge=0.0, le=100.0, description="Filler-Word Score (15% weight)")
    speaking_pace_score: float = Field(..., ge=0.0, le=100.0, description="Speaking Pace Score (15% weight)")
    response_completeness: float = Field(..., ge=0.0, le=100.0, description="Response Completeness (25% weight)")
    wpm: Optional[float] = None
    filler_rate: Optional[float] = None
    grammar_mistakes_count: Optional[int] = 0
    sub_metrics: List[SubMetricDetail] = []


class ConfidenceBreakdown(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0, description="Overall Confidence Score (25% weight)")
    weight: float = 0.25
    eye_contact: Optional[float] = Field(None, ge=0.0, le=100.0, description="Eye Contact Consistency (20% weight)")
    facial_engagement: Optional[float] = Field(None, ge=0.0, le=100.0, description="Facial Engagement (20% weight)")
    hesitation_score: float = Field(..., ge=0.0, le=100.0, description="Response Hesitation Score (20% weight)")
    speaking_confidence: float = Field(..., ge=0.0, le=100.0, description="Speaking Confidence (25% weight)")
    attention_level: Optional[float] = Field(None, ge=0.0, le=100.0, description="Attention Level (15% weight)")
    video_analysis_available: bool = False
    sub_metrics: List[SubMetricDetail] = []


class TechnicalRelevanceBreakdown(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0, description="Overall Technical Relevance Score (30% weight)")
    weight: float = 0.30
    technical_accuracy: float = Field(..., ge=0.0, le=100.0, description="Technical Accuracy (30% weight)")
    keyword_relevance: float = Field(..., ge=0.0, le=100.0, description="Keyword Relevance (15% weight)")
    problem_solving: float = Field(..., ge=0.0, le=100.0, description="Problem Solving Ability (20% weight)")
    domain_knowledge: float = Field(..., ge=0.0, le=100.0, description="Domain Knowledge (20% weight)")
    answer_completeness: float = Field(..., ge=0.0, le=100.0, description="Answer Completeness (15% weight)")
    questions_evaluated_count: int = 0
    sub_metrics: List[SubMetricDetail] = []


class ProfessionalismBreakdown(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0, description="Overall Professionalism Score (15% weight)")
    weight: float = 0.15
    time_management: float = Field(..., ge=0.0, le=100.0, description="Time Management (20% weight)")
    response_organization: float = Field(..., ge=0.0, le=100.0, description="Response Organization (30% weight)")
    professional_communication: float = Field(..., ge=0.0, le=100.0, description="Professional Communication (30% weight)")
    interview_etiquette: float = Field(..., ge=0.0, le=100.0, description="Interview Etiquette (20% weight)")
    sub_metrics: List[SubMetricDetail] = []


class QuestionEvaluation(BaseModel):
    question_id: int | str
    question: str
    candidate_answer: str
    score: float = Field(..., ge=0.0, le=100.0)
    technical_accuracy: float = Field(..., ge=0.0, le=100.0)
    keyword_relevance: float = Field(..., ge=0.0, le=100.0)
    problem_solving: float = Field(..., ge=0.0, le=100.0)
    domain_knowledge: float = Field(..., ge=0.0, le=100.0)
    answer_completeness: float = Field(..., ge=0.0, le=100.0)
    communication_observations: Optional[str] = ""
    feedback: str = ""
    improvement_suggestion: str = ""
    missing_points: List[str] = []
    matched_keywords: List[str] = []


class EvidenceItem(BaseModel):
    metric: str
    score: float
    evidence: str
    impact: str
    recommendation: str


class LearningResource(BaseModel):
    title: str
    category: str
    type: str  # "Course", "Article", "Practice Drill", "Documentation"
    description: str
    url: str


class AssessmentReport(BaseModel):
    assessment_id: str
    interview_id: str
    candidate_id: str
    candidate_name: str
    domain: str = "Full Stack"
    difficulty: str = "Medium"
    interview_type: str = "Technical"
    
    # 4 Core Category Scores
    communication_score: float = Field(..., ge=0.0, le=100.0)
    confidence_score: float = Field(..., ge=0.0, le=100.0)
    technical_relevance_score: float = Field(..., ge=0.0, le=100.0)
    professionalism_score: float = Field(..., ge=0.0, le=100.0)
    
    # Final Weighted Overall Score & Tier Rating
    overall_score: float = Field(..., ge=0.0, le=100.0)
    performance_rating: str  # "Excellent", "Good", "Average", "Needs Improvement", "Poor"
    recommendation: str = "Hire"  # "Strong Hire", "Hire", "Consider", "Reject"
    
    # Detailed Breakdowns
    communication: CommunicationBreakdown
    confidence: ConfidenceBreakdown
    technical_relevance: TechnicalRelevanceBreakdown
    professionalism: ProfessionalismBreakdown
    
    # Question-Level Evaluations
    question_evaluations: List[QuestionEvaluation] = []
    
    # Personalized AI Feedback
    strengths: List[str] = []
    weaknesses: List[str] = []
    improvement_suggestions: List[str] = []
    practice_recommendations: List[str] = []
    learning_resources: List[LearningResource] = []
    evidence: List[EvidenceItem] = []
    
    # Session metadata & summaries
    duration_seconds: int = 0
    questions_attempted: int = 0
    total_questions: int = 0
    video_analysis_available: bool = False
    speech_analysis_available: bool = False
    
    created_at: str
    updated_at: str
