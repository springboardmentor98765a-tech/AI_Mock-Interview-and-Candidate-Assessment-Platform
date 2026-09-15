import React from 'react';

interface AudioPlayerProps {
  audioUrl: string | null;
  onAnalyze: () => void;
  isLoading: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, onAnalyze, isLoading }) => {
  if (!audioUrl) return null;

  return (
    <div className="audio-player-card glass-card">
      <div className="player-header">
        <h4>🎧 Recorded Audio Playback</h4>
        <span className="badge badge-success">Audio Ready</span>
      </div>
      <audio controls src={audioUrl} className="custom-audio-element" style={{ width: '100%', marginTop: '0.75rem' }} />
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onAnalyze} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner"></span> Analyzing Speech...
            </>
          ) : (
            '⚡ Analyze Speech & Communication'
          )}
        </button>
        <a href={audioUrl} download="interview_recording.webm" className="btn btn-outline" style={{ textDecoration: 'none' }}>
          📥 Download Audio (.webm)
        </a>
      </div>
    </div>
  );
};
