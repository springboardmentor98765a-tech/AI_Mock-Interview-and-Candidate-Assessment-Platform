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
    voiceConfidence: Optional[float] = None  # 0-1, avg Web Speech API confidence (voice answers only)


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
    has_recording: bool = False
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    candidate_name: Optional[str] = None

    # Module 7 — AI Feedback & Scoring
    skill_professionalism: Optional[int] = None
    rating_label: Optional[str] = None
    feedback_json: Optional[str] = None  # JSON-encoded structured feedback, decoded client-side
    behavior_eye_contact_pct: Optional[int] = None
    behavior_engagement_pct: Optional[int] = None
    behavior_attention_level: Optional[str] = None
    behavior_confidence_label: Optional[str] = None
    behavior_dominant_emotion: Optional[str] = None

    # Module 10 — Admin "AI performance monitoring"
    scoring_source: Optional[str] = None  # "ai" | "simulator"
    scoring_provider: Optional[str] = None  # "ollama" | "gemini" | "openai" | "grok", when scoring_source == "ai"


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

    # Module 5 — Speech-to-Text & Communication Analysis
    filler_word_count: int = 0
    filler_words_found: Optional[str] = None  # JSON list, decoded client-side
    grammar_issue_count: int = 0
    grammar_feedback: Optional[str] = None
    speech_wpm: Optional[int] = None
    voice_confidence: Optional[float] = None
    pronunciation_score: Optional[int] = None


class ViolationOut(BaseModel):
    violations: int
    auto_submit: bool = False


# =================================================================
# Module 7 — AI Feedback & Scoring: optional body for PATCH /:id/finish,
# carrying the Module 6 webcam-analytics snapshot the frontend already
# computes locally (interview-session.js) so the Confidence Score can
# use real signals instead of guessing. Every field is optional — a
# typed/voice-only session with no webcam simply omits this.
# =================================================================
class BehaviorMetricsIn(BaseModel):
    eyeContactPct: Optional[int] = None
    engagementPct: Optional[int] = None
    attentionLevel: Optional[str] = None      # "High" | "Medium" | "Low"
    confidenceLabel: Optional[str] = None     # "High" | "Moderate" | "Low"
    dominantEmotion: Optional[str] = None


class FinishInterviewRequest(BaseModel):
    behaviorMetrics: Optional[BehaviorMetricsIn] = None


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

    # Module 7 — AI Feedback & Scoring
    rating_label: Optional[str] = None
    skill_communication: Optional[int] = None
    skill_confidence: Optional[int] = None
    skill_technical: Optional[int] = None
    skill_professionalism: Optional[int] = None
    feedback_json: Optional[str] = None  # JSON-encoded {strengths,weaknesses,improvements,practice_recommendations,learning_resources}


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


# ---------------------------------------------------------------
# Coding Practice (standalone — not part of the scored interview flow)
# ---------------------------------------------------------------
class RoleLanguageOut(BaseModel):
    role: str
    language: str


class CodingQuestionOut(BaseModel):
    id: str
    title: str
    difficulty: str
    prompt: str
    language: str
    starter_code: str


class GenerateCodingQuestionRequest(BaseModel):
    role: str
    difficulty: str = "medium"  # easy | medium | hard


class GeneratedCodingQuestionOut(BaseModel):
    id: str
    title: str
    difficulty: str
    prompt: str
    language: str
    starter_code: str
    source: str  # 'ai' (Gemini) | 'bank' (offline fallback — Gemini unavailable/unconfigured)


class SubmitCodeRequest(BaseModel):
    role: str
    questionId: str
    code: str


class TestCaseResultOut(BaseModel):
    input: str
    expected_output: str
    actual_output: str
    passed: bool
    error: Optional[str] = None


class SubmitCodeResponse(BaseModel):
    id: int
    questionId: str
    title: str
    language: str
    compiled: bool
    compileError: Optional[str] = None
    passedCount: int
    totalCount: int
    scorePercent: int
    results: list[TestCaseResultOut]


class CodingSubmissionOut(BaseModel):
    id: int
    questionId: str
    title: str
    role: str
    language: str
    passedCount: int
    totalCount: int
    scorePercent: int
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)


# =================================================================
# Module 1 — Recruiter "Create interview templates"
# =================================================================
class InterviewTemplateIn(BaseModel):
    name: str
    interviewType: str
    category: Optional[str] = None
    domain: Optional[str] = None
    difficulty: str = "medium"
    questionCount: int = 5
    mode: str = "online"


class InterviewTemplateOut(BaseModel):
    id: int
    name: str
    interviewType: str
    category: Optional[str] = None
    domain: Optional[str] = None
    difficulty: str
    questionCount: int
    mode: str
    createdByName: Optional[str] = None
    createdAt: datetime


# =================================================================
# Module 8 — Dashboard & Analytics
# =================================================================
class TrendPointOut(BaseModel):
    """One point on a candidate's score-over-time chart."""

    interview_id: int
    date: Optional[datetime] = None
    interview_type: str
    score: Optional[int] = None
    communication: Optional[int] = None
    technical: Optional[int] = None
    confidence: Optional[int] = None
    problemSolving: Optional[int] = None
    professionalism: Optional[int] = None


class SkillAnalyticsOut(BaseModel):
    """Skill-wise analytics for one of the five scored categories."""

    skill: str  # communication | technical | confidence | problemSolving | professionalism
    label: str
    average: int
    best: int
    worst: int
    trend: str  # "improving" | "declining" | "steady"
    sample_size: int


class WeakAreaOut(BaseModel):
    """One flagged weak area, with a canned practice suggestion."""

    skill: str
    label: str
    average: int
    recommendation: str


class BreakdownEntryOut(BaseModel):
    """One interview's score breakdown, for the 'score breakdown reports' list."""

    interview_id: int
    interview_type: str
    date: Optional[datetime] = None
    score: Optional[int] = None
    rating_label: Optional[str] = None
    communication: Optional[int] = None
    confidence: Optional[int] = None
    technical: Optional[int] = None
    professionalism: Optional[int] = None


class RankingEntryOut(BaseModel):
    """One row of the staff candidate-ranking leaderboard."""

    rank: int
    candidate_id: int
    full_name: str
    email: str
    average_score: int
    completed_count: int
    best_score: Optional[int] = None
    last_completed: Optional[datetime] = None


class TrendBucketOut(BaseModel):
    """One week's average score, for the platform-wide performance trend."""

    period: str  # ISO date of the week's start (Monday)
    average_score: int
    count: int


class PerformanceSummaryOut(BaseModel):
    """Compact JSON version of the candidate performance-summary PDF —
    handy for a dashboard widget that doesn't need the full PDF."""

    completed_count: int
    average_score: int
    best_score: int
    skills: list[SkillAnalyticsOut]
    weak_areas: list[WeakAreaOut]
    recent_scores: list[int]


# =================================================================
# Module 9 — Notifications & Reports
# =================================================================
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    role: Optional[str] = None
    title: str
    message: str
    is_read: bool
    created_at: Optional[datetime] = None


class UnreadCountOut(BaseModel):
    unread: int


class ReminderRunOut(BaseModel):
    """Result of a POST /api/notifications/reminders/run scan."""

    scanned: int
    reminders_sent: int
    window_hours: int


# =================================================================
# Module 10 — Recruiter Dashboard: candidate profiles, comparison,
# shortlisting insights
# =================================================================
class ResumeSnapshotOut(BaseModel):
    """Lightweight read of the candidate's latest resume — Node/Module 2
    owns the resumes table; this is a read-only reflection of it for
    the recruiter candidate-profile view."""

    resume_id: int
    skills: list[str] = Field(default_factory=list)
    experience_years: Optional[float] = None
    ats_score: Optional[int] = None
    summary: Optional[str] = None
    uploaded_at: Optional[datetime] = None


class CandidateProfileOut(BaseModel):
    """Module 10 — recruiter 'Candidate profiles & reports': one
    candidate's identity, resume snapshot, score summary, skill
    breakdown, weak areas, and recent interviews, combined."""

    candidate_id: int
    full_name: str
    email: str
    bio: Optional[str] = None
    completed_count: int
    average_score: int
    best_score: int
    resume: Optional[ResumeSnapshotOut] = None
    skills: list[SkillAnalyticsOut]
    weak_areas: list[WeakAreaOut]
    recent_interviews: list[BreakdownEntryOut]


class CandidateComparisonEntryOut(BaseModel):
    """One candidate's row in a side-by-side comparison."""

    candidate_id: int
    full_name: str
    email: str
    completed_count: int
    average_score: int
    best_score: Optional[int] = None
    skills: dict  # {"communication": 82, "technical": 75, ...} — average per skill


class ShortlistEntryOut(BaseModel):
    """Module 10 — recruiter 'Shortlisting insights': a candidate who
    clears the given bar, with a short auto-generated rationale."""

    candidate_id: int
    full_name: str
    email: str
    completed_count: int
    average_score: int
    strongest_skill: Optional[str] = None
    weakest_skill: Optional[str] = None
    insight: str


# =================================================================
# Module 10 — Admin Dashboard: AI performance monitoring, platform
# usage analytics, system health
# =================================================================
class AiPerformanceOut(BaseModel):
    """Real usage-based counterpart to GET /api/admin/ai/status (which
    only reports which provider keys are configured). This reports
    what actually happened across scored interviews."""

    total_scored: int
    ai_scored_count: int
    simulator_scored_count: int
    ai_scored_pct: int
    provider_usage: dict  # {"gemini": 12, "openai": 3, ...}
    average_score_ai: Optional[int] = None
    average_score_simulator: Optional[int] = None


class PlatformUsageOut(BaseModel):
    """Module 10 — admin 'Platform usage analytics', scoped to the
    features this service (Python) owns — pairs with Node's broader
    GET /api/admin/analytics for users/interviews-by-type."""

    interviews_online: int
    interviews_offline: int
    interviews_with_recording: int
    coding_submissions: int
    generated_coding_questions: int
    interview_templates: int
    resumes_uploaded: int
    notifications_sent: int
    notifications_unread: int


class SystemHealthOut(BaseModel):
    """Module 10 — admin 'System activity/health reports': a quick
    liveness snapshot of this service (Node's GET /api/admin/activity
    already covers the append-only activity log)."""

    status: str  # "ok" | "degraded"
    database: str  # "ok" | "error"
    uptime_seconds: int
    recordings_count: int
    recordings_mb: float
    tts_cache_files: int
    tts_cache_mb: float
    activity_last_24h: int

