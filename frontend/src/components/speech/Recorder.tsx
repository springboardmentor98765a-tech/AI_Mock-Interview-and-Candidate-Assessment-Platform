import React from 'react';

interface RecorderProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onClear: () => void;
  error?: string | null;
}

export const Recorder: React.FC<RecorderProps> = ({
  isRecording,
  isPaused,
  recordingTime,
  onStart,
  onStop,
  onPause,
  onResume,
  onClear,
  error
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="recorder-container glass-card">
      <div className="recorder-header">
        <h3>🎙️ Audio Recording Studio</h3>
        <div className={`recording-status ${isRecording ? (isPaused ? 'paused' : 'active') : ''}`}>
          {isRecording ? (isPaused ? '⏸️ Paused' : '🔴 Recording Live Audio') : 'Ready to record'}
        </div>
      </div>

      <div className="timer-counter">
        <span className="time-display">{formatTime(recordingTime)}</span>
        <span className="time-hint">{recordingTime < 5 && isRecording ? '(Speak for at least 5s)' : ''}</span>
      </div>

      {error && (
        <div className="alert-box error">
          ⚠️ {error}
        </div>
      )}

      <div className="controls-toolbar">
        {!isRecording ? (
          <button className="btn btn-primary btn-lg" onClick={onStart}>
            ▶️ Start Recording
          </button>
        ) : (
          <>
            {isPaused ? (
              <button className="btn btn-primary" onClick={onResume}>
                ▶️ Resume
              </button>
            ) : (
              <button className="btn btn-outline" onClick={onPause}>
                ⏸️ Pause
              </button>
            )}
            <button className="btn btn-danger" onClick={onStop}>
              🛑 Stop Recording
            </button>
          </>
        )}
        <button className="btn btn-outline" onClick={onClear} disabled={isRecording}>
          🔄 Reset
        </button>
      </div>
    </div>
  );
};
