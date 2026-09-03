import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role = Column(String, nullable=True)
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    resource_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    metadata_json = Column("metadata", JSON, nullable=True)

class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, index=True, nullable=False)
    category = Column(String, nullable=False)
    difficulty = Column(String, nullable=False, default="Medium")
    question = Column(Text, unique=True, nullable=False)
    expected_answer = Column(Text, nullable=True)
    evaluation_points = Column(JSON, nullable=True)
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resume_id = Column(Integer, ForeignKey("resume_uploads.id"), nullable=True)
    
    interview_type = Column(String, nullable=False, default="Technical")
    domain = Column(String, nullable=False, default="Software Engineering")
    difficulty = Column(String, nullable=False, default="Medium")
    duration_mins = Column(Integer, default=30)
    experience_level = Column(String, default="Mid")
    skills_detected = Column(JSON, nullable=True)
    
    status = Column(String, nullable=False, default="Generated")  # Draft, Generated, Assigned, In Progress, Completed, Cancelled
    ai_provider = Column(String, nullable=False, default="Gemini")
    ai_model = Column(String, nullable=False, default="gemini-2.5-flash")
    generation_source = Column(String, nullable=False, default="AI")  # AI or Question Bank
    fallback_reason = Column(Text, nullable=True)
    generation_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    candidate = relationship("User", foreign_keys=[candidate_id])
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    questions = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan")
    sessions = relationship("InterviewSession", back_populates="interview", cascade="all, delete-orphan")

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    difficulty = Column(String, nullable=False, default="Medium")
    expected_answer = Column(Text, nullable=True)
    evaluation_points = Column(JSON, nullable=True)
    sequence_no = Column(Integer, nullable=False, default=1)

    interview = relationship("Interview", back_populates="questions")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="CREATED", index=True)  # CREATED, IN_PROGRESS, PAUSED, COMPLETED
    started_at = Column(DateTime, nullable=True, default=None)
    ended_at = Column(DateTime, nullable=True, default=None)
    last_resumed_at = Column(DateTime, nullable=True, default=None)
    paused_accumulated_seconds = Column(Integer, default=0)
    total_active_seconds = Column(Integer, default=0)
    current_question_index = Column(Integer, default=0)
    duration = Column(Integer, default=0)  # seconds
    score = Column(Float, default=0.0)
    remarks = Column(Text, nullable=True)
    answers_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    interview = relationship("Interview", back_populates="sessions")
    candidate = relationship("User", foreign_keys=[candidate_id])
    attempts = relationship("InterviewQuestionAttempt", back_populates="session", cascade="all, delete-orphan")
    recordings = relationship("InterviewRecording", back_populates="session", cascade="all, delete-orphan")
    speech_analyses = relationship("SpeechAnalysis", back_populates="session", cascade="all, delete-orphan")
    behavior_analysis = relationship("InterviewBehaviorAnalysis", back_populates="session", uselist=False, cascade="all, delete-orphan")
    performance_report = relationship("CandidatePerformanceReport", back_populates="session", uselist=False, cascade="all, delete-orphan")

class CandidatePerformanceReport(Base):
    __tablename__ = "candidate_performance_reports"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False, unique=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    overall_score = Column(Float, nullable=True)
    performance_rating = Column(String, nullable=True)

    communication_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    technical_relevance_score = Column(Float, nullable=True)
    professionalism_score = Column(Float, nullable=True)

    communication_analysis_json = Column(JSON, nullable=True)
    confidence_analysis_json = Column(JSON, nullable=True)
    technical_analysis_json = Column(JSON, nullable=True)
    professionalism_analysis_json = Column(JSON, nullable=True)

    strengths = Column(JSON, nullable=True)
    weaknesses = Column(JSON, nullable=True)
    improvement_suggestions = Column(JSON, nullable=True)
    practice_recommendations = Column(JSON, nullable=True)
    learning_resources = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    session = relationship("InterviewSession", back_populates="performance_report")
    interview = relationship("Interview")
    candidate = relationship("User", foreign_keys=[candidate_id])


class SpeechAnalysis(Base):
    __tablename__ = "speech_analyses"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("interview_questions.id"), nullable=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    transcript = Column(Text, nullable=True)
    word_count = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    words_per_minute = Column(Float, default=0.0)

    filler_word_count = Column(Integer, default=0)
    filler_words = Column(JSON, nullable=True)

    grammar_score = Column(Float, default=0.0)
    pronunciation_score = Column(Float, nullable=True, default=None)  # Saved as null when unavailable per spec
    clarity_score = Column(Float, default=0.0)
    communication_score = Column(Float, default=0.0)

    feedback = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("InterviewSession", back_populates="speech_analyses")
    question = relationship("InterviewQuestion")
    candidate = relationship("User", foreign_keys=[candidate_id])

class InterviewQuestionAttempt(Base):
    __tablename__ = "interview_question_attempts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("interview_questions.id"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False, default=1)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    time_spent = Column(Float, default=0.0)  # active seconds spent
    attempted = Column(Boolean, default=True)
    answer = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("InterviewSession", back_populates="attempts")
    question = relationship("InterviewQuestion")

class InterviewRecording(Base):
    __tablename__ = "interview_recordings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False, index=True)
    recording_type = Column(String, nullable=False, default="VIDEO_AUDIO")
    file_name = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    duration = Column(Float, default=0.0)  # actual media duration
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("InterviewSession", back_populates="recordings")


class InterviewBehaviorAnalysis(Base):
    __tablename__ = "interview_behavior_analyses"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    confidence_score = Column(Float, nullable=True, default=None)
    confident_frames_count = Column(Integer, default=0)
    unconfident_frames_count = Column(Integer, default=0)
    total_analyzed_frames = Column(Integer, default=0)
    analysis_status = Column(String, default="in_progress")

    facial_presentation = Column(String, default="Composed and consistent")
    dominant_emotion = Column(String, default="neutral")
    emotion_distribution_json = Column(JSON, nullable=True)
    expression_consistency = Column(Float, default=0.0)
    positive_expression_frequency = Column(String, default="Occasional")
    facial_engagement = Column(String, default="Good")
    expression_changes_count = Column(Integer, default=0)

    eye_contact_percentage = Column(Float, default=0.0)
    attention_score = Column(Float, default=0.0)
    look_away_events_count = Column(Integer, default=0)
    look_away_duration_seconds = Column(Float, default=0.0)
    face_absence_events_count = Column(Integer, default=0)

    engagement_score = Column(Float, default=0.0)
    engagement_category = Column(String, default="Moderate")

    mobile_detected = Column(Boolean, default=False)
    mobile_event_count = Column(Integer, default=0)
    mobile_events_json = Column(JSON, nullable=True)

    fullscreen_violations_count = Column(Integer, default=0)
    fullscreen_warnings_count = Column(Integer, default=0)
    auto_terminated = Column(Boolean, default=False)
    auto_termination_reason = Column(Text, nullable=True)

    behavior_summary = Column(Text, nullable=True)
    raw_timeline_json = Column(JSON, nullable=True)
    violations_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("InterviewSession", back_populates="behavior_analysis")
    interview = relationship("Interview")
    candidate = relationship("User", foreign_keys=[candidate_id])



