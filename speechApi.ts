import { SpeechAnalysisResponse, GrammarAnalysis, FillerAnalysis, PaceAnalysis, PronunciationAnalysis, CommunicationScore } from '../types/speech';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';

export async function transcribeAudio(audioBlob: Blob, prompt?: string): Promise<{ transcript: string; audio_duration: number; word_count: number }> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  if (prompt) formData.append('prompt', prompt);

  const res = await fetch(`${API_BASE}/api/speech/transcribe`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Transcription failed.');
  }
  return res.json();
}

export async function analyzeAudioSpeech(
  audioBlob: Blob, 
  questionId?: string, 
  explicitDuration?: number,
  expectedText?: string,
  liveTranscript?: string
): Promise<SpeechAnalysisResponse> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'speech_sample.webm');
  if (questionId) formData.append('question_id', questionId);
  if (explicitDuration) formData.append('explicit_duration', explicitDuration.toString());
  if (expectedText) formData.append('expected_text', expectedText);
  if (liveTranscript) formData.append('live_transcript', liveTranscript);

  const res = await fetch(`${API_BASE}/api/speech/analyze`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Speech analysis failed.');
  }
  return res.json();
}

export async function analyzeTextSpeech(transcript: string, audioDuration?: number, questionId?: string): Promise<SpeechAnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/speech/text-analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, audio_duration: audioDuration || 30.0, question_id: questionId })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Text analysis failed.');
  }
  return res.json();
}

export async function getAnalysisSession(sessionId: string): Promise<SpeechAnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/speech/analysis/${sessionId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to load analysis record.');
  }
  return res.json();
}
