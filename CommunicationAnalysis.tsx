import React, { useState } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { Recorder } from '../components/speech/Recorder';
import { LiveTranscript } from '../components/speech/LiveTranscript';
import { AudioPlayer } from '../components/speech/AudioPlayer';
import { TranscriptViewer } from '../components/speech/TranscriptViewer';
import { GrammarAnalysis } from '../components/speech/GrammarAnalysis';
import { FillerAnalysis } from '../components/speech/FillerAnalysis';
import { PaceAnalysis } from '../components/speech/PaceAnalysis';
import { PauseAnalysis } from '../components/speech/PauseAnalysis';
import { PronunciationAnalysis } from '../components/speech/PronunciationAnalysis';
import { CommunicationScore } from '../components/speech/CommunicationScore';
import { FeedbackPanel } from '../components/speech/FeedbackPanel';
import { analyzeAudioSpeech, analyzeTextSpeech } from '../services/speechApi';
import { SpeechAnalysisResponse } from '../types/speech';

export const CommunicationAnalysisPage: React.FC = () => {
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    liveTranscript,
    error: recorderError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording
  } = useRecorder();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<SpeechAnalysisResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fallback text input state for testing without microphone
  const [textMode, setTextMode] = useState<boolean>(false);
  const [customTranscript, setCustomTranscript] = useState<string>(
    "Um, in my previous role as a full stack engineer, basically I designed scalable microservices using FastAPI and Docker, you know, to handle high concurrent user traffic."
  );
  const [customDuration, setCustomDuration] = useState<number>(35);

  const handleAnalyze = async () => {
    setApiError(null);
    if (!audioBlob) {
      setApiError('Please record audio first before analyzing.');
      return;
    }

    if (recordingTime < 3 && !textMode) {
      setApiError('Recording is too short. Please speak for at least 3 to 5 seconds.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeAudioSpeech(
        audioBlob, 
        undefined, 
        recordingTime > 0 ? recordingTime : undefined,
        undefined,
        liveTranscript || undefined
      );
      setAnalysisResult(result);
    } catch (err: any) {
      setApiError(err.message || 'Speech analysis failed. Please check backend connectivity and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextAnalyze = async () => {
    setApiError(null);
    if (!customTranscript.trim()) {
      setApiError('Please enter a transcript text to analyze.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeTextSpeech(customTranscript, customDuration);
      setAnalysisResult(result);
    } catch (err: any) {
      setApiError(err.message || 'Text speech analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAll = () => {
    clearRecording();
    setAnalysisResult(null);
    setApiError(null);
  };

  return (
    <div className="communication-analysis-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Page Header */}
      <div className="page-header-box" style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <span className="badge badge-candidate" style={{ marginBottom: '0.5rem' }}>🎙️ AI Communication Intelligence</span>
        <h1 style={{ fontSize: '2.4rem', margin: '0.5rem 0' }}>Speech-to-Text & Communication Analysis</h1>
        <p style={{ maxWidth: '750px', margin: '0 auto', color: 'var(--text-muted)' }}>
          Real-time microphone capture, automated Speech-to-Text transcription, grammatical verification, 
          filler-word detection, speech pace metrics (WPM), pause & silence dynamics, pronunciation scoring, and AI communication coaching.
        </p>

        {/* Mode switcher for testing flexibility */}
        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button 
            className={`btn ${!textMode ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTextMode(false)}
          >
            🎙️ Live Microphone Mode
          </button>
          <button 
            className={`btn ${textMode ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTextMode(true)}
          >
            ✍️ Text / Direct Transcript Mode
          </button>
        </div>
      </div>

      {apiError && (
        <div className="alert-box error" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-danger)' }}>
          ❌ <strong>Analysis Alert:</strong> {apiError}
        </div>
      )}

      {/* Input Section */}
      {!textMode ? (
        <div className="recording-section-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Recorder Controller */}
          <Recorder
            isRecording={isRecording}
            isPaused={isPaused}
            recordingTime={recordingTime}
            onStart={startRecording}
            onStop={stopRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onClear={handleResetAll}
            error={recorderError}
          />

          {/* Live Audio / Transcript Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <LiveTranscript liveText={liveTranscript} isRecording={isRecording} />
            <AudioPlayer audioUrl={audioUrl} onAnalyze={handleAnalyze} isLoading={isLoading} />
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <h3>✍️ Direct Transcript & Speech Analysis Testbed</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            Enter spoken transcript text and simulated speaking duration to run deterministic grammar, filler, pace, pronunciation, and score calculations.
          </p>
          <div className="form-group">
            <label>Spoken Transcript</label>
            <textarea
              className="form-control"
              rows={4}
              value={customTranscript}
              onChange={(e) => setCustomTranscript(e.target.value)}
              placeholder="Paste or type candidate spoken response..."
            />
          </div>
          <div className="form-group" style={{ maxWidth: '240px' }}>
            <label>Estimated Speaking Duration (seconds)</label>
            <input
              type="number"
              className="form-control"
              value={customDuration}
              onChange={(e) => setCustomDuration(Number(e.target.value))}
              min={5}
              max={600}
            />
          </div>
          <button className="btn btn-primary" onClick={handleTextAnalyze} disabled={isLoading}>
            {isLoading ? 'Analyzing...' : '⚡ Run Text Analysis'}
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', marginBottom: '2rem' }}>
          <div className="spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1.5rem auto' }}></div>
          <h3>Processing Audio & Computing Speech Metrics...</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Running STT engine, linguistic grammar parser, filler-word detector, RMS pause timeline, and AI communication coaching synthesis.
          </p>
        </div>
      )}

      {/* Analysis Results Dashboard */}
      {analysisResult && !isLoading && (
        <div className="analysis-dashboard-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Top Row: Overall Communication Score & Transcript */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            <CommunicationScore score={analysisResult.communication} />
            <TranscriptViewer
              transcript={analysisResult.transcript}
              highlightedTranscript={analysisResult.fillers?.highlighted_transcript}
              wordCount={analysisResult.word_count}
              charCount={analysisResult.character_count}
              sentenceCount={analysisResult.sentence_count}
              duration={analysisResult.audio_duration}
            />
          </div>

          {/* Middle Row: Metrics Breakdown (Pace, Fillers, Pauses, Pronunciation, Grammar) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            <PaceAnalysis pace={analysisResult.pace} />
            <FillerAnalysis fillers={analysisResult.fillers} />
            <PauseAnalysis pauses={analysisResult.pauses} />
            <PronunciationAnalysis pronunciation={analysisResult.pronunciation} />
          </div>

          {/* Grammar In-Depth Row */}
          <GrammarAnalysis grammar={analysisResult.grammar} />

          {/* AI Executive Communication Feedback */}
          <FeedbackPanel feedback={analysisResult.feedback} />
        </div>
      )}
    </div>
  );
};

export default CommunicationAnalysisPage;
