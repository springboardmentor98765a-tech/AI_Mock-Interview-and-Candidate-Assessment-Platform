import React, { useState } from 'react';

interface TranscriptViewerProps {
  transcript: string;
  highlightedTranscript?: string;
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  duration: number;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcript,
  highlightedTranscript,
  wordCount,
  charCount,
  sentenceCount,
  duration
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview_transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="transcript-viewer glass-card">
      <div className="viewer-header">
        <h4>📝 Generated Spoken Transcript</h4>
        <div className="action-buttons">
          <button className="btn btn-outline btn-sm" onClick={handleCopy}>
            {copied ? '✅ Copied' : '📋 Copy Transcript'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleDownload}>
            📥 Download TXT
          </button>
        </div>
      </div>

      <div className="stats-badges-row">
        <span className="stat-pill">⏱️ Duration: <strong>{duration}s</strong></span>
        <span className="stat-pill">🔤 Words: <strong>{wordCount}</strong></span>
        <span className="stat-pill">🔡 Characters: <strong>{charCount}</strong></span>
        <span className="stat-pill">📄 Sentences: <strong>{sentenceCount}</strong></span>
      </div>

      <div
        className="transcript-content-box"
        dangerouslySetInnerHTML={{ __html: highlightedTranscript || transcript }}
      />
    </div>
  );
};
