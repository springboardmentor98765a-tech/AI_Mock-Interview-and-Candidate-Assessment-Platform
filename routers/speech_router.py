import os
import uuid
import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.auth import get_current_user, get_optional_user
from backend.database import db
from backend.models.speech_models import (
    SpeechAnalysisResponse,
    TextOnlyAnalysisRequest,
    GrammarRequest,
    GrammarAnalysisResult,
    FillerRequest,
    FillerAnalysisResult,
    PaceRequest,
    PaceAnalysisResult,
    PronunciationRequest,
    PronunciationAnalysisResult,
    CommunicationScoreRequest,
    CommunicationScoreBreakdown
)
from backend.services.audio_processor import validate_audio_file, analyze_audio_pauses, estimate_audio_duration_and_energy
from backend.services.stt_service import transcribe_audio
from backend.services.filler_service import analyze_fillers
from backend.services.pace_service import calculate_speech_pace, count_transcript_words, count_transcript_sentences
from backend.services.grammar_service import analyze_grammar
from backend.services.pronunciation_service import analyze_pronunciation
from backend.services.communication_service import compute_communication_score, generate_ai_communication_feedback

router = APIRouter(prefix="/api/speech", tags=["Speech-to-Text & Communication Analysis"])

# In-memory storage for speech analysis records
if not hasattr(db, "speech_sessions"):
    db.speech_sessions = {}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RECORDINGS_DIR = os.path.join(BASE_DIR, "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)

@router.post("/transcribe")
async def transcribe_speech(
    file: UploadFile = File(...),
    prompt: Optional[str] = Form(None),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Transcribes uploaded audio using the configured Speech-to-Text engine.
    """
    contents = await file.read()
    valid, err_msg = validate_audio_file(file.filename, file.content_type, len(contents))
    if not valid:
        raise HTTPException(status_code=400, detail=err_msg)

    transcript, meta = transcribe_audio(contents, file.content_type or "audio/webm", prompt or "")
    duration, _ = estimate_audio_duration_and_energy(contents, file.filename)
    word_count = count_transcript_words(transcript)

    return {
        "transcript": transcript,
        "audio_duration": round(duration, 2),
        "word_count": word_count,
        "metadata": meta
    }

@router.post("/analyze", response_model=SpeechAnalysisResponse)
async def analyze_speech_audio(
    file: UploadFile = File(...),
    question_id: Optional[str] = Form(None),
    expected_text: Optional[str] = Form(None),
    live_transcript: Optional[str] = Form(None),
    explicit_duration: Optional[float] = Form(None),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Complete end-to-end speech analysis: audio validation, STT transcription,
    grammar checking, filler detection, pace (WPM), pause timeline, pronunciation,
    composite communication score, and personalized AI feedback.
    """
    contents = await file.read()
    valid, err_msg = validate_audio_file(file.filename, file.content_type, len(contents))
    if not valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # 1. Transcribe Audio
    transcript, _ = transcribe_audio(
        file_bytes=contents, 
        mime_type=file.content_type or "audio/webm", 
        prompt=expected_text or "",
        live_transcript=live_transcript
    )
    if not transcript or not transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="No intelligible speech could be transcribed from the recording. Please speak clearly into the microphone."
        )

    # 2. Audio & Pause Analysis
    duration, _ = estimate_audio_duration_and_energy(contents, file.filename)
    if explicit_duration and explicit_duration > 0:
        duration = explicit_duration
    
    if duration < settings.MIN_AUDIO_DURATION_SECONDS:
        raise HTTPException(
            status_code=400,
            detail=f"Recording is too short ({duration:.1f}s). Please speak for at least {int(settings.MIN_AUDIO_DURATION_SECONDS)} seconds."
        )

    pauses_result = analyze_audio_pauses(contents, file.filename, duration)

    # 3. Metrics Calculation
    word_count = count_transcript_words(transcript)
    char_count = len(transcript)
    sentence_count = count_transcript_sentences(transcript)

    # 4. Fillers Analysis
    fillers_result = analyze_fillers(transcript)

    # 5. Pace Analysis
    pace_result = calculate_speech_pace(word_count, duration)

    # 6. Grammar Analysis
    grammar_result = analyze_grammar(transcript)

    # 7. Pronunciation Analysis
    pronunciation_result = analyze_pronunciation(transcript, expected_text)

    # 8. Communication Quality Scoring
    communication_scores = compute_communication_score(
        grammar=grammar_result,
        fillers=fillers_result,
        pace=pace_result,
        pauses=pauses_result,
        pronunciation=pronunciation_result,
        transcript=transcript
    )

    # 9. AI Feedback Synthesis
    ai_feedback = generate_ai_communication_feedback(
        transcript=transcript,
        scores=communication_scores,
        grammar=grammar_result,
        fillers=fillers_result,
        pace=pace_result,
        pauses=pauses_result
    )

    # 10. Persist Session & Audio (if storage enabled)
    session_id = f"speech_sess_{uuid.uuid4().hex[:8]}"
    audio_url = None
    if settings.ENABLE_PERMANENT_AUDIO_STORAGE or True:
        ext = os.path.splitext(file.filename)[1] or ".webm"
        audio_filename = f"{session_id}{ext}"
        audio_path = os.path.join(RECORDINGS_DIR, audio_filename)
        try:
            with open(audio_path, "wb") as f:
                f.write(contents)
            audio_url = f"/recordings/{audio_filename}"
        except Exception:
            pass

    response_data = SpeechAnalysisResponse(
        session_id=session_id,
        question_id=question_id,
        audio_duration=round(duration, 1),
        transcript=transcript,
        word_count=word_count,
        character_count=char_count,
        sentence_count=sentence_count,
        grammar=grammar_result,
        fillers=fillers_result,
        pace=pace_result,
        pauses=pauses_result,
        pronunciation=pronunciation_result,
        communication=communication_scores,
        feedback=ai_feedback,
        audio_url=audio_url,
        created_at=datetime.datetime.now().isoformat()
    )

    db.speech_sessions[session_id] = response_data.model_dump()

    return response_data

@router.post("/text-analyze", response_model=SpeechAnalysisResponse)
def analyze_text_transcript(
    req: TextOnlyAnalysisRequest,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Performs speech and communication analysis directly on a text transcript.
    """
    transcript = req.transcript.strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript text cannot be empty.")

    duration = max(3.0, float(req.audio_duration or 30.0))
    word_count = count_transcript_words(transcript)
    char_count = len(transcript)
    sentence_count = count_transcript_sentences(transcript)

    # Silence/pause simulation based on sentence boundaries
    pauses_result = analyze_audio_pauses(b"", "text_mode.webm", duration)
    fillers_result = analyze_fillers(transcript)
    pace_result = calculate_speech_pace(word_count, duration)
    grammar_result = analyze_grammar(transcript)
    pronunciation_result = analyze_pronunciation(transcript)
    
    communication_scores = compute_communication_score(
        grammar=grammar_result,
        fillers=fillers_result,
        pace=pace_result,
        pauses=pauses_result,
        pronunciation=pronunciation_result,
        transcript=transcript
    )

    ai_feedback = generate_ai_communication_feedback(
        transcript=transcript,
        scores=communication_scores,
        grammar=grammar_result,
        fillers=fillers_result,
        pace=pace_result,
        pauses=pauses_result
    )

    session_id = f"speech_sess_{uuid.uuid4().hex[:8]}"
    response_data = SpeechAnalysisResponse(
        session_id=session_id,
        question_id=req.question_id,
        audio_duration=round(duration, 1),
        transcript=transcript,
        word_count=word_count,
        character_count=char_count,
        sentence_count=sentence_count,
        grammar=grammar_result,
        fillers=fillers_result,
        pace=pace_result,
        pauses=pauses_result,
        pronunciation=pronunciation_result,
        communication=communication_scores,
        feedback=ai_feedback,
        audio_url=None,
        created_at=datetime.datetime.now().isoformat()
    )

    db.speech_sessions[session_id] = response_data.model_dump()
    return response_data

@router.post("/grammar", response_model=GrammarAnalysisResult)
def evaluate_grammar_endpoint(req: GrammarRequest):
    return analyze_grammar(req.transcript)

@router.post("/fillers", response_model=FillerAnalysisResult)
def evaluate_fillers_endpoint(req: FillerRequest):
    return analyze_fillers(req.transcript, req.custom_fillers)

@router.post("/pace", response_model=PaceAnalysisResult)
def evaluate_pace_endpoint(req: PaceRequest):
    return calculate_speech_pace(req.word_count, req.duration_seconds)

@router.post("/pronunciation", response_model=PronunciationAnalysisResult)
def evaluate_pronunciation_endpoint(req: PronunciationRequest):
    return analyze_pronunciation(req.transcript, req.expected_text)

@router.post("/communication-score", response_model=CommunicationScoreBreakdown)
def calculate_communication_score_endpoint(req: CommunicationScoreRequest):
    weights = settings.COMMUNICATION_WEIGHTS
    weighted_sum = (
        req.grammar_score * weights["grammar"] +
        req.fluency_score * weights["fluency"] +
        req.pronunciation_score * weights["pronunciation"] +
        req.pace_score * weights["pace"] +
        req.clarity_score * weights["clarity"] +
        req.vocabulary_score * weights["vocabulary"] +
        req.confidence_score * weights["confidence"]
    )
    overall = max(0, min(100, int(round(weighted_sum))))
    return CommunicationScoreBreakdown(
        overall_score=overall,
        grammar=req.grammar_score,
        fluency=req.fluency_score,
        pronunciation=req.pronunciation_score,
        pace=req.pace_score,
        clarity=req.clarity_score,
        vocabulary=req.vocabulary_score,
        confidence=req.confidence_score
    )

@router.get("/analysis/{session_id}", response_model=SpeechAnalysisResponse)
def get_speech_analysis_by_session(session_id: str):
    record = db.speech_sessions.get(session_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Speech analysis session '{session_id}' not found.")
    return record
