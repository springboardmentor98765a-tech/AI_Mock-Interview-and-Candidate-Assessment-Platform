from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------
# Requests
# ---------------------------------------------------------------
class GenerateInterviewRequest(BaseModel):
    interviewType: str
    category: Optional[str] = "Mixed"  # HR | Technical | Behavioral | Aptitude | Mixed
    domain: Optional[str] = None
    difficulty: Optional[str] = "medium"  # easy | medium | hard
    questionCount: Optional[int] = 5
    mode: Optional[str] = "online"  # online | offline


class UpdateInterviewRequest(BaseModel):
    interviewType: Optional[str] = None
    category: Optional[str] = None
    domain: Optional[str] = None
    difficulty: Optional[str] = None
    questionCount: Optional[int] = None
    mode: Optional[str] = None
    scheduledAt: Optional[datetime] = None
    regenerate: Optional[bool] = False


class StartInterviewRequest(BaseModel):
    interviewType: str
    mode: Optional[str] = "online"


class ScheduleInterviewRequest(BaseModel):
    interviewType: str
    mode: Optional[str] = "online"
    scheduledAt: datetime


class ReviewRequest(BaseModel):
    feedback: str = Field(min_length=1)


class AnswerIn(BaseModel):
    questionId: int
    answerText: str = ""
    inputMode: Optional[str] = "typed"  # "typed" | "voice"
    timeTakenSeconds: Optional[int] = None


class ViolationIn(BaseModel):
    type: str = "tab_switch"  # tab_switch | fullscreen_exit | no_face | multi_face | look_away | copy_paste


# ---------------------------------------------------------------
# Responses
# ---------------------------------------------------------------
class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    interview_id: int
    question_text: str
    category: str
    difficulty: str
    sequence_no: int


class InterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidate_id: int
    interview_type: str
    mode: str
    status: str
    score: Optional[int] = None
    skill_communication: Optional[int] = None
    skill_technical: Optional[int] = None
    skill_confidence: Optional[int] = None
    skill_problem_solving: Optional[int] = None
    ai_feedback: Optional[str] = None
    domain: Optional[str] = None
    difficulty: str
    question_count: int
    proctoring_violations: int = 0
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    candidate_name: Optional[str] = None


class InterviewWithQuestionsOut(BaseModel):
    interview: InterviewOut
    questions: list[QuestionOut]


class AnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    interview_id: int
    question_id: int
    answer_text: Optional[str] = None
    input_mode: str
    time_taken_seconds: Optional[int] = None


class ViolationOut(BaseModel):
    violations: int
    auto_submit: bool = False


class FeedbackOut(BaseModel):
    """What the candidate sees on GET /interviews/{id}/feedback."""

    interview_id: int
    interview_type: str
    status: str
    score: Optional[int] = None
    ai_feedback: Optional[str] = None
    recruiter_feedback: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_by_role: Optional[str] = None
    has_feedback: bool


class StatsOut(BaseModel):
    mockInterviews: int
    averageScore: int
    reportsGenerated: int
    upcomingInterviews: int
    skills: dict


class CandidateSummaryOut(BaseModel):
    candidate_id: int
    full_name: str
    email: str
    bio: Optional[str] = None
    latest_interview_id: Optional[int] = None
    interview_type: Optional[str] = None
    score: Optional[int] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class OverviewOut(BaseModel):
    totalCandidates: int
    completedCount: int
    averageScore: int
    todayCount: int
    hiringSuccess: int
    skills: dict


class TTSManifestOut(BaseModel):
    interview_id: int
    questions: list[dict]
