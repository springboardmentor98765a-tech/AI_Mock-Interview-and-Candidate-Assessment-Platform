import datetime
from typing import Optional, List, Union, Any, Dict
from pydantic import BaseModel, Field, ConfigDict, AliasChoices
from schemas.enums import DifficultyEnum, InterviewTypeEnum, InterviewStatusEnum, ExperienceLevelEnum

class InterviewGenerateRequest(BaseModel):
    candidate_id: Optional[int] = Field(None, description="Target candidate user ID")
    resume_id: Optional[int] = Field(None, description="Resume upload record ID")
    interview_type: str = Field("Technical", description="Interview Type (HR, Technical, Sales, etc.)")
    domain: str = Field("Software Engineering", validation_alias=AliasChoices("target_domain", "domain"), description="Target Domain")
    difficulty: str = Field("Medium", description="Difficulty (Easy, Medium, Hard)")
    num_questions: int = Field(5, ge=3, le=15, validation_alias=AliasChoices("question_count", "num_questions"), description="Number of questions (3-15)")
    duration_mins: int = Field(30, ge=5, le=180, validation_alias=AliasChoices("duration", "duration_mins"), description="Estimated duration in minutes")
    experience_level: str = Field("Mid", description="Candidate Experience Level (Entry, Mid, Senior, Executive)")

    model_config = ConfigDict(populate_by_name=True)

class RegenerateQuestionRequest(BaseModel):
    question_id: int = Field(..., description="ID of the specific question to regenerate")

class InterviewStartRequest(BaseModel):
    interview_id: int = Field(..., description="ID of the interview to start")

class InterviewSessionCreateRequest(BaseModel):
    interview_id: int = Field(..., description="ID of the assigned interview")

class InterviewSessionPositionRequest(BaseModel):
    current_question_index: int = Field(..., ge=0, description="Current question index position")

class InterviewSessionResponse(BaseModel):
    id: int
    interview_id: int
    candidate_id: int
    status: str
    started_at: Optional[Union[datetime.datetime, str]] = None
    ended_at: Optional[Union[datetime.datetime, str]] = None
    current_question_index: int = 0
    created_at: Optional[Union[datetime.datetime, str]] = None
    updated_at: Optional[Union[datetime.datetime, str]] = None

    model_config = ConfigDict(from_attributes=True)

class InterviewSessionDetailResponse(BaseModel):
    session: InterviewSessionResponse
    interview_id: int
    domain: str
    interview_type: str
    difficulty: str
    duration_mins: int
    questions: List[Any] = []

    model_config = ConfigDict(from_attributes=True)


class InterviewSubmitAnswer(BaseModel):
    question_id: int
    user_answer: Optional[str] = None
    selected_option: Optional[Union[int, str]] = None

class InterviewSubmitRequest(BaseModel):
    interview_id: int
    answers: List[InterviewSubmitAnswer] = []
    time_taken_seconds: int = 0

class InterviewQuestionPublicSchema(BaseModel):
    id: int
    sequence_no: int
    question_text: str
    category: str
    difficulty: str

    model_config = ConfigDict(from_attributes=True)

class InterviewQuestionAdminSchema(BaseModel):
    id: int
    sequence_no: int
    question_text: str
    category: str
    difficulty: str
    expected_answer: Optional[str] = None
    evaluation_points: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True)

class InterviewSummaryResponse(BaseModel):
    interview_id: int
    candidate_id: int
    candidate_name: str
    skills_detected: List[str] = []
    interview_type: str
    domain: str
    difficulty: str
    num_questions: int
    duration_mins: int
    ai_provider: str
    ai_model: str
    generation_source: str
    fallback_reason: Optional[str] = None
    status: str
    created_at: Union[datetime.datetime, str]
    questions: Optional[List[Dict[str, Any]]] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class InterviewDetailResponse(BaseModel):
    id: int
    candidate_id: int
    candidate_name: str
    recruiter_id: Optional[int] = None
    resume_id: Optional[int] = None
    interview_type: str
    domain: str
    difficulty: str
    duration_mins: int
    experience_level: str
    skills_detected: List[str] = []
    status: str
    ai_provider: str
    ai_model: str
    generation_source: str
    fallback_reason: Optional[str] = None
    generation_timestamp: Optional[Union[datetime.datetime, str]] = ""
    created_at: Union[datetime.datetime, str]
    questions: List[Union[InterviewQuestionAdminSchema, InterviewQuestionPublicSchema]] = []

    model_config = ConfigDict(from_attributes=True)

class QuestionBankCreate(BaseModel):
    domain: str
    category: str
    difficulty: str = "Medium"
    question: str
    expected_answer: Optional[str] = None
    evaluation_points: Optional[List[str]] = None

class QuestionBankUpdate(BaseModel):
    domain: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    question: Optional[str] = None
    expected_answer: Optional[str] = None
    evaluation_points: Optional[List[str]] = None

class QuestionBankResponse(BaseModel):
    id: int
    domain: str
    category: str
    difficulty: str
    question: str
    expected_answer: Optional[str] = None
    evaluation_points: Optional[List[str]] = None
    usage_count: int = 0
    created_at: Union[datetime.datetime, str]

    model_config = ConfigDict(from_attributes=True)

class InterviewQuestionAttemptCreate(BaseModel):
    question_id: int = Field(..., description="ID of the target question")
    question_number: int = Field(1, description="Sequence/question number")
    started_at: Optional[Union[datetime.datetime, str]] = None
    ended_at: Optional[Union[datetime.datetime, str]] = None
    time_spent: float = Field(0.0, description="Active time spent in seconds")
    attempted: bool = Field(True, description="Whether question was attempted")
    answer: Optional[str] = Field(None, description="Candidate response text")

class InterviewQuestionAttemptResponse(BaseModel):
    id: int
    session_id: int
    question_id: int
    question_number: int
    started_at: Optional[Union[datetime.datetime, str]] = None
    ended_at: Optional[Union[datetime.datetime, str]] = None
    time_spent: float
    attempted: bool
    answer: Optional[str] = None
    created_at: Optional[Union[datetime.datetime, str]] = None

    model_config = ConfigDict(from_attributes=True)

class InterviewRecordingResponse(BaseModel):
    id: int
    session_id: int
    recording_type: str
    file_name: str
    storage_path: str
    mime_type: str
    file_size: int
    duration: float
    created_at: Optional[Union[datetime.datetime, str]] = None

    model_config = ConfigDict(from_attributes=True)

class InterviewSessionStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status transition")

