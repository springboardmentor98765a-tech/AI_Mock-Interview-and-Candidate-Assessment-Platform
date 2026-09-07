from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class GrammarMistake(BaseModel):
    original_sentence: str
    incorrect_portion: str
    suggested_correction: str
    explanation: str
    severity: str = "Medium"  # Low, Medium, High

class SentenceGrammarAnalysis(BaseModel):
    sentence_index: int
    original_sentence: str
    is_valid: bool
    status: str = "Correct"  # "Correct" or "Needs Correction"
    corrected_sentence: str
    mistakes: List[GrammarMistake] = []
    mistakes_count: int = 0
    score: int = 100

class GrammarAnalysisResult(BaseModel):
    score: int
    mistakes_count: int
    corrected_sentences_count: int
    total_sentences_count: int = 0
    passed_sentences_count: int = 0
    mistakes: List[GrammarMistake] = []
    sentences_analysis: List[SentenceGrammarAnalysis] = []
    improvement_suggestions: List[str] = []
    highlighted_transcript: str = ""

class FillerWordDetail(BaseModel):
    word: str
    count: int
    timestamps: List[float] = []

class FillerAnalysisResult(BaseModel):
    total: int
    rate: float  # Percentage of filler words
    most_used: Optional[str] = None
    most_used_count: int = 0
    words: Dict[str, int] = {}
    details: List[FillerWordDetail] = []
    highlighted_transcript: str = ""

class PaceAnalysisResult(BaseModel):
    speaking_duration_seconds: float
    word_count: int
    wpm: float
    category: str  # Very Slow, Slow, Normal, Fast, Very Fast
    recommendation: str

class PauseTimelineSegment(BaseModel):
    type: str  # "speech" or "pause"
    start: float
    end: float
    duration: float

class PauseAnalysisResult(BaseModel):
    count: int
    average_duration: float
    longest_duration: float
    total_silence_duration: float
    silence_percentage: float
    short_pauses: int
    normal_pauses: int
    long_pauses: int
    timeline: List[PauseTimelineSegment] = []

class PronunciationIssue(BaseModel):
    word: str
    status: str = "Needs Improvement"
    feedback: str
    confidence: Optional[float] = None

class PronunciationAnalysisResult(BaseModel):
    score: int
    issues: List[PronunciationIssue] = []
    clarity_assessment: str = ""

class CommunicationScoreBreakdown(BaseModel):
    overall_score: int
    grammar: int
    fluency: int
    pronunciation: int
    pace: int
    clarity: int
    vocabulary: int
    confidence: int

class AIFeedbackResult(BaseModel):
    strengths: List[str] = []
    improvements: List[str] = []
    recommendations: List[str] = []

class SpeechAnalysisResponse(BaseModel):
    session_id: str
    question_id: Optional[str] = None
    audio_duration: float
    transcript: str
    word_count: int
    character_count: int
    sentence_count: int
    grammar: GrammarAnalysisResult
    fillers: FillerAnalysisResult
    pace: PaceAnalysisResult
    pauses: PauseAnalysisResult
    pronunciation: PronunciationAnalysisResult
    communication: CommunicationScoreBreakdown
    feedback: AIFeedbackResult
    audio_url: Optional[str] = None
    created_at: Optional[str] = None

class TextOnlyAnalysisRequest(BaseModel):
    transcript: str
    audio_duration: Optional[float] = 30.0
    question_id: Optional[str] = None

class GrammarRequest(BaseModel):
    transcript: str

class FillerRequest(BaseModel):
    transcript: str
    custom_fillers: Optional[List[str]] = None

class PaceRequest(BaseModel):
    word_count: int
    duration_seconds: float

class PronunciationRequest(BaseModel):
    transcript: str
    expected_text: Optional[str] = None

class CommunicationScoreRequest(BaseModel):
    grammar_score: int
    fluency_score: int
    pronunciation_score: int
    pace_score: int
    clarity_score: int
    vocabulary_score: int
    confidence_score: int
