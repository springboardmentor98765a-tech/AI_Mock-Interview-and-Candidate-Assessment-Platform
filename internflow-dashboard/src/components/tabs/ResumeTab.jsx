import React, { useState } from 'react';

const ResumeTab = ({ resumeScore, keywordMatch, formattingScore, onResumeUpload }) => {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      onResumeUpload(e);
      setShowUpload(false);
    }
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>📄 Resume & ATS Analysis</h2>
        <p>Upload your resume for AI-powered analysis and ATS compatibility scoring.</p>
      </div>

      <div className="resume-container">
        <div className="resume-score-overview">
          <div className="score-circle-large">
            <div className="score-number">{resumeScore}</div>
            <div className="score-label">Overall Score</div>
          </div>
          
          <div className="score-breakdown">
            <div className="score-item">
              <div className="score-item-header">
                <span className="score-item-label">🔑 Keyword Match</span>
                <span className="score-item-value">{keywordMatch}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${keywordMatch}%`, background: '#4f46e5' }}></div>
              </div>
            </div>
            <div className="score-item">
              <div className="score-item-header">
                <span className="score-item-label">📐 ATS Formatting</span>
                <span className="score-item-value">{formattingScore}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${formattingScore}%`, background: '#22c55e' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="resume-upload-section">
          <div className="upload-card">
            <div className="upload-icon">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            <h4>Upload New Resume</h4>
            <p>Upload your latest CV in PDF or DOCX format for instant AI analysis.</p>
            
            {!showUpload ? (
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                <i className="fas fa-upload"></i> Choose File
              </button>
            ) : (
              <div className="upload-area">
                <input
                  type="file"
                  className="form-control"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                />
                <button className="btn btn-secondary mt-2" onClick={() => setShowUpload(false)}>
                  Cancel
                </button>
              </div>
            )}

            {uploadedFile && (
              <div className="upload-success">
                <i className="fas fa-check-circle text-success"></i>
                <span>{uploadedFile.name} uploaded successfully!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeTab;