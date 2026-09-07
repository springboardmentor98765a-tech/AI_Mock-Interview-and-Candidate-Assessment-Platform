import React from 'react';

interface LiveTranscriptProps {
  liveText: string;
  isRecording: boolean;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({ liveText, isRecording }) => {
  if (!isRecording && !liveText) return null;

  return (
    <div className="live-transcript-box glass-card">
      <div className="transcript-badge">
        <span className="pulse-dot"></span> Live Speech Stream
      </div>
      <p className="live-text">
        {liveText || (isRecording ? 'Listening... start speaking to see real-time transcription' : '')}
      </p>
    </div>
  );
};
