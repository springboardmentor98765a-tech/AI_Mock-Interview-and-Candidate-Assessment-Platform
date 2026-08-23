from datetime import datetime
from decimal import Decimal
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
    # Milestone 3 — computed client-side (face-api.js) while this
    # question was on screen; optional, since the browser may not
    # support/allow the camera-based model to load.
    dominantEmotion: Optional[str] = None
    eyeContactPercentage: Optional[int] = None
    # Average Web Speech API recognition confidence (0-100) for this
    # answer, computed client-side — a rough pronunciation-clarity
    # proxy, null for typed answers or unsupported browsers.
    pronunciationConfidence: Optional[int] = None
    # MCQ: the option letter the candidate picked (e.g. "B").
    selectedOption: Optional[str] = None
    # Coding: the candidate's full program + which language it's in.
    codeAnswer: Optional[str] = None
    codeLanguage: Optional[str] = None  # "python" | "javascript"


class ViolationIn(BaseModel):
    type: str = "tab_switch"  # tab_switch | fullscreen_exit | no_face | multi_face | look_away | copy_paste


class RunCodeRequest(BaseModel):
    """POST /interviews/{id}/questions/{qid}/run — candidate 'Run Code'
    button. Executes against the question's test cases WITHOUT scoring
    or persisting anything, so the candidate can iterate before saving
    their final answer via the normal AnswerIn/submit_answer flow."""

    codeAnswer: str = ""
    codeLanguage: Optional[str] = "python"  # "python" | "javascript"


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
    # MCQ / Coding round. question_type: "open" | "mcq" | "coding".
    # options/test_cases are raw JSON strings (frontend JSON.parses
    # them) — correct_option is intentionally NOT exposed here so the
    # answer can't be read off the question payload.
    question_type: str = "open"
    options: Optional[str] = None
    marks: float = 1
    test_cases: Optional[str] = None
    starter_code: Optional[str] = None


class InterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: Optional[str] = None
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
    questions_attempted: int = 0
    proctoring_violations: int = 0
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    paused_seconds: int = 0
    duration_seconds: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    candidate_name: Optional[str] = None
    # Deterministic MCQ/coding marks sheet totals — see schema.sql.
    marks_awarded: Optional[float] = None
    marks_total: Optional[float] = None


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
    filler_word_count: Optional[int] = None
    words_per_minute: Optional[int] = None
    dominant_emotion: Optional[str] = None
    eye_contact_percentage: Optional[int] = None
    # Module 5 — previously computed server-side (speech_analysis.py) but
    # not exposed here; now returned so the frontend can render the full
    # Communication/Confidence breakdown instead of only filler/WPM.
    grammar_issue_count: Optional[int] = None
    pronunciation_confidence: Optional[int] = None
    keyword_match_percentage: Optional[int] = None
    # MCQ / Coding round grading result for this answer.
    selected_option: Optional[str] = None
    code_answer: Optional[str] = None
    code_language: Optional[str] = None
    is_correct: Optional[bool] = None
    marks_awarded: Optional[float] = None
    test_case_results: Optional[str] = None  # JSON string; frontend JSON.parses it


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


class ScoreSheetRow(BaseModel):
    question_id: int
    sequence_no: int
    question_type: str
    question_text: str
    marks: float
    marks_awarded: float
    is_correct: Optional[bool] = None          # MCQ only
    selected_option: Optional[str] = None       # MCQ only
    correct_option: Optional[str] = None        # MCQ only — revealed here, after submission
    test_cases_passed: Optional[int] = None     # coding only
    test_cases_total: Optional[int] = None      # coding only


class ScoreSheetOut(BaseModel):
    """GET /interviews/{id}/scoresheet — the deterministic, per-question
    marks breakdown for the MCQ + coding round (2 marks/MCQ, 10 marks
    for the coding question), independent of the holistic AI score."""

    interview_id: int
    marks_awarded: float
    marks_total: float
    rows: list[ScoreSheetRow]


class RunCodeTestCaseResult(BaseModel):
    input: str
    expected: str
    actual: str
    passed: bool


class RunCodeResult(BaseModel):
    """GET-time response for the candidate's 'Run Code' button — a
    test execution, not a graded submission."""

    question_id: int
    passed_count: int
    total_count: int
    results: list[RunCodeTestCaseResult]


class RecordingOut(BaseModel):
    """Metadata for a session's video+audio recording — returned by
    the upload endpoint and by the lightweight /recording/meta check
    dashboards use to decide whether to show a 'View Recording'
    button, without pulling the video itself."""

    model_config = ConfigDict(from_attributes=True)

    interview_id: int
    mime_type: str
    size_bytes: int
    duration_seconds: Optional[int] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    audio_file_path: Optional[str] = None
    audio_mime_type: Optional[str] = None


# ---------------------------------------------------------------
# Module 5 & 6 — Communication / Confidence report
# (GET /interviews/{id}/communication-report)
# ---------------------------------------------------------------
class CommunicationReportRow(BaseModel):
    """Per-question Module 5/6 signal breakdown — one row per answered
    open-ended question, in the order it was asked."""

    question_id: int
    sequence_no: int
    category: str
    question_text: str
    word_count: int
    filler_word_count: Optional[int] = None
    words_per_minute: Optional[int] = None
    grammar_issue_count: Optional[int] = None
    keyword_match_percentage: Optional[int] = None
    dominant_emotion: Optional[str] = None
    eye_contact_percentage: Optional[int] = None
    pronunciation_confidence: Optional[int] = None
    input_mode: str


class CommunicationReportOut(BaseModel):
    """Aggregated Module 5 (Speech-to-Text & Communication Analysis) +
    Module 6 (Emotion Detection & Eye Tracking) report for one
    interview, shaped around the scoring-rubric parameters from the
    project spec: Communication (clarity/grammar/filler/pace/
    completeness) and Confidence (eye contact/facial engagement/
    hesitation/attention)."""

    interview_id: int
    questions_analyzed: int
    # Communication Score (30%) parameters
    avg_words_per_minute: Optional[int] = None
    total_filler_words: int
    filler_word_ratio: Optional[float] = None  # fillers / total words, 0-1
    avg_grammar_issues: Optional[float] = None
    avg_keyword_match_percentage: Optional[int] = None
    avg_response_completeness: Optional[int] = None  # avg word_count as a rough completeness proxy
    # Confidence Score (25%) parameters
    avg_eye_contact_percentage: Optional[int] = None
    avg_pronunciation_confidence: Optional[int] = None
    dominant_emotion_overall: Optional[str] = None
    emotion_breakdown: dict = {}
    voice_answer_ratio: Optional[float] = None  # fraction of answers given by voice vs typed
    # Module 6 attention / engagement proxies, pulled from proctoring.
    proctoring_violations: int = 0
    pace_label: Optional[str] = None       # "slow" | "good" | "fast"
    filler_label: Optional[str] = None     # "low" | "moderate" | "heavy"
    confidence_label: Optional[str] = None # "low" | "moderate" | "high"
    rows: list[CommunicationReportRow] = []
