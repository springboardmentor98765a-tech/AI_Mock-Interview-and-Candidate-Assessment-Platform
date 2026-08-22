import React, { useState, useRef, useEffect } from 'react';
import WebcamRecorder from '../WebcamRecorder';

const InterviewTab = ({ 
  showNewInterview, 
  setShowNewInterview,
  generatedQuestions, 
  interviewStarted, 
  setInterviewStarted,
  currentQuestionIndex, 
  setCurrentQuestionIndex,
  answers, 
  setAnswers,
  formData, 
  setFormData,
  isSpeaking, 
  isListening,
  speakQuestion, 
  startListening, 
  stopListening,
  handleGenerateInterview, 
  handleSubmitInterview: handleSubmitInterviewOriginal,
  handleForceSubmitInterview,
  handleNextQuestion, 
  loading, 
  submitting,
  sessionTime,
  isPaused,
  formatTime,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onEndSession: onEndSessionOriginal,
  activeSession,
  sessionStatus,
  interviewId: propInterviewId
}) => {
  // State for recording
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Ref for WebcamRecorder
  const webcamRef = useRef(null);

  // Use interviewId from props or localStorage
  const interviewId = propInterviewId || localStorage.getItem('currentInterviewId') || (activeSession && activeSession.id);

  // Save interviewId to localStorage when it changes
  useEffect(() => {
    if (propInterviewId) {
      localStorage.setItem('currentInterviewId', propInterviewId);
      console.log('📌 Interview ID saved:', propInterviewId);
    }
  }, [propInterviewId]);

  // =============================================
  // DOMAIN OPTIONS
  // =============================================
  const getDomainOptions = () => {
    switch(formData.interview_type) {
      case 'tr':
        return [
          { value: 'ai_ml', label: '🤖 AI & Machine Learning' },
          { value: 'sde', label: '💻 Software Development (SDE)' },
          { value: 'fullstack', label: '🌐 Full Stack' },
          { value: 'frontend', label: '🎨 Frontend' },
          { value: 'backend', label: '⚙️ Backend' },
        ];
      case 'mr':
        return [
          { value: 'leadership', label: '👔 Leadership' },
          { value: 'team_management', label: '👥 Team Management' },
          { value: 'project_management', label: '📋 Project Management' },
          { value: 'strategy', label: '📊 Strategy & Planning' },
        ];
      case 'hr':
        return [
          { value: 'general', label: '📚 General' },
          { value: 'behavioral', label: '🧠 Behavioral' },
          { value: 'cultural_fit', label: '🏢 Cultural Fit' },
          { value: 'communication', label: '💬 Communication' },
        ];
      default:
        return [{ value: 'general', label: '📚 General' }];
    }
  };

  const getDomainLabel = (value) => {
    const options = getDomainOptions();
    const found = options.find(opt => opt.value === value);
    return found ? found.label : value;
  };

  const getInterviewTypeLabel = (type) => {
    switch(type) {
      case 'tr': return 'Technical Round (TR)';
      case 'mr': return 'Managerial Round (MR)';
      case 'hr': return 'HR Round (HR)';
      default: return type;
    }
  };

  // =============================================
  // RECORDING HANDLERS
  // =============================================
  const handleRecordingStart = () => {
    setIsRecording(true);
    console.log('🎥 Recording started');
  };

  const handleRecordingStop = (url, blob) => {
    setRecordingUrl(url);
    setRecordingBlob(blob);
    setIsRecording(false);
    console.log('🎥 Recording stopped, size:', blob.size);
  };

  const handleVideoBlob = (blob) => {
    console.log('📹 Video blob received:', blob.size);
  };

  // =============================================
  // AUTO-STOP RECORDING ON SUBMIT/END
  // =============================================
  const stopRecordingAutomatically = async () => {
    if (webcamRef.current) {
      console.log('🛑 Auto-stopping recording...');
      await webcamRef.current.stopRecording();
      // Wait for upload to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  };

  // Wrapper for Submit Interview - Stop recording first
  const handleSubmitWithRecording = async () => {
    console.log('📤 Submitting interview - stopping recording...');
    await stopRecordingAutomatically();
    // Then submit
    handleSubmitInterviewOriginal();
  };

  // Wrapper for End Session - Stop recording first
  const handleEndWithRecording = async () => {
    console.log('⏹️ Ending session - stopping recording...');
    await stopRecordingAutomatically();
    // Then end
    onEndSessionOriginal();
  };

  // =============================================
  // HANDLE START INTERVIEW
  // =============================================
  const handleStartInterview = async () => {
    // Request camera permissions first
    if (webcamRef.current) {
      console.log('📷 Requesting camera permissions...');
      await webcamRef.current.requestPermissions();
    }
    
    // Start the interview
    setInterviewStarted(true);
    if (activeSession) {
      onStartSession(activeSession.id);
    } else if (interviewId) {
      onStartSession(interviewId);
    }
    speakQuestion(generatedQuestions[0].question);
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="interview-tab">
      {/* Header */}
      <div className="tab-header">
        <div className="header-left">
          <h2>🎙️ Mock Interview</h2>
          <p>Practice with AI-powered voice interviews - just like the real thing!</p>
        </div>
        {!showNewInterview && !generatedQuestions && (
          <button className="btn-new-interview" onClick={() => setShowNewInterview(true)}>
            <i className="fas fa-plus"></i> New Interview
          </button>
        )}
      </div>

      {/* New Interview Form */}
      {showNewInterview && !generatedQuestions && (
        <div className="interview-form-card">
          <div className="card-header">
            <h3>🎯 Start New Interview</h3>
            <button className="btn-close" onClick={() => setShowNewInterview(false)}>×</button>
          </div>
          <div className="card-body">
            <p className="text-muted">Select your interview round, domain, and difficulty level.</p>
            <form onSubmit={handleGenerateInterview}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Interview Round <span className="required">*</span></label>
                  <select
                    className="form-control"
                    value={formData.interview_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      let defaultDomain = '';
                      if (newType === 'tr') defaultDomain = 'sde';
                      else if (newType === 'mr') defaultDomain = 'leadership';
                      else if (newType === 'hr') defaultDomain = 'general';
                      setFormData({ ...formData, interview_type: newType, domain: defaultDomain });
                    }}
                    required
                  >
                    <option value="">Select Round Type</option>
                    <option value="tr">💻 Technical Round (TR)</option>
                    <option value="mr">👔 Managerial Round (MR)</option>
                    <option value="hr">🤝 HR Round (HR)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Domain / Specialization <span className="required">*</span></label>
                  <select
                    className="form-control"
                    value={formData.domain}
                    onChange={(e) => setFormData({...formData, domain: e.target.value})}
                    required
                    disabled={!formData.interview_type}
                  >
                    <option value="">
                      {!formData.interview_type ? 'Select Round Type First' : 'Select Domain'}
                    </option>
                    {getDomainOptions().map((domain) => (
                      <option key={domain.value} value={domain.value}>{domain.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Difficulty Level <span className="required">*</span></label>
                  <select
                    className="form-control"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    required
                  >
                    <option value="easy">⭐ Easy</option>
                    <option value="medium">⭐⭐ Medium</option>
                    <option value="hard">⭐⭐⭐ Hard</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Number of Questions</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.questionCount}
                    onChange={(e) => setFormData({...formData, questionCount: parseInt(e.target.value)})}
                    min="3"
                    max="10"
                    required
                  />
                </div>
              </div>

              {formData.interview_type && formData.domain && (
                <div className="selected-summary">
                  <span className="summary-label">Selected:</span>
                  <span className="summary-value">
                    {getInterviewTypeLabel(formData.interview_type)} → {getDomainLabel(formData.domain)}
                  </span>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading || !formData.interview_type || !formData.domain}>
                  {loading ? '⏳ Generating...' : '🎯 Generate Questions'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewInterview(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interview Questions */}
      {generatedQuestions && (
        <div className="interview-questions-card">
          <div className="card-body">
            <div className="interview-info">
              <span className="info-badge"><strong>Round:</strong> {getInterviewTypeLabel(formData.interview_type)}</span>
              <span className="info-badge"><strong>Domain:</strong> {getDomainLabel(formData.domain)}</span>
              <span className="info-badge"><strong>Difficulty:</strong> {formData.difficulty}</span>
              <span className="info-badge"><strong>Questions:</strong> {generatedQuestions.length}</span>
              
              {sessionStatus && (
                <span className={`info-badge session-status ${sessionStatus}`}>
                  <i className={`fas ${
                    sessionStatus === 'in_progress' ? 'fa-play' :
                    sessionStatus === 'paused' ? 'fa-pause' :
                    sessionStatus === 'ended' ? 'fa-stop' :
                    sessionStatus === 'completed' ? 'fa-check' :
                    'fa-clock'
                  }`}></i>
                  {sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}
                </span>
              )}
            </div>

            {/* Webcam Section */}
            <div className="webcam-section">
              <div className="webcam-header">
                <h4>📹 Recording Status</h4>
                <span className={`recording-status ${isRecording ? 'active' : 'inactive'}`}>
                  {isRecording ? '🔴 Recording' : '⏸️ Ready'}
                </span>
              </div>
              <WebcamRecorder
                ref={webcamRef}
                isRecording={isRecording}
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
                onVideoBlob={handleVideoBlob}
                sessionActive={interviewStarted && (sessionStatus === 'in_progress' || sessionStatus === 'paused')}
                interviewId={interviewId}
                showPreview={false}
              />
            </div>

            {/* Listening Indicator */}
            {isListening && (
              <div className="listening-indicator">
                <span className="pulse-dot"></span>
                <span>Listening... Speak now</span>
                <button 
                  className="btn btn-sm btn-danger ms-auto"
                  onClick={() => {
                    console.log('⏹️ Stop button clicked');
                    stopListening();
                  }}
                >
                  Stop
                </button>
              </div>
            )}

            {/* Session Status Message */}
            {sessionStatus === 'ended' && (
              <div className="session-ended-message">
                <i className="fas fa-info-circle"></i>
                <span>Session ended. Click "Submit Interview" to complete your interview.</span>
              </div>
            )}

            {sessionStatus === 'completed' && (
              <div className="session-ended-message success">
                <i className="fas fa-check-circle"></i>
                <span>Interview submitted successfully!</span>
              </div>
            )}

            {!interviewStarted ? (
              <div className="start-interview">
                <div className="start-icon">🎙️</div>
                <h3>Ready to Start?</h3>
                <p>The AI will read each question aloud. You will answer by speaking.</p>
                <button 
                  className="btn btn-success btn-lg"
                  onClick={handleStartInterview}
                >
                  🎤 Start Interview
                </button>
              </div>
            ) : (
              <>
                <div className="question-header">
                  <h4>Question {currentQuestionIndex + 1} of {generatedQuestions.length}</h4>
                  <div className="question-badges">
                    <span className={`badge difficulty ${generatedQuestions[currentQuestionIndex]?.difficulty}`}>
                      {generatedQuestions[currentQuestionIndex]?.difficulty}
                    </span>
                    {isSpeaking && <span className="badge speaking">🔊 Speaking...</span>}
                    {isListening && <span className="badge listening">🎤 Listening...</span>}
                  </div>
                </div>

                <div className="question-text">
                  <p>{generatedQuestions[currentQuestionIndex]?.question}</p>
                </div>

                <div className="voice-controls">
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => speakQuestion(generatedQuestions[currentQuestionIndex].question)}
                    disabled={isSpeaking || isPaused || sessionStatus === 'ended' || sessionStatus === 'completed'}
                  >
                    🔊 Replay
                  </button>
                  
                  {!isListening && !answers[currentQuestionIndex] && !isPaused && sessionStatus !== 'ended' && sessionStatus !== 'completed' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        console.log('🎤 Speak button clicked');
                        startListening();
                      }}
                      disabled={isSpeaking || isPaused}
                    >
                      🎤 Speak
                    </button>
                  )}

                  {isListening && (
                    <button 
                      className="btn btn-danger"
                      onClick={() => {
                        console.log('⏹️ Stop button clicked');
                        stopListening();
                      }}
                    >
                      ⏹️ Stop Speaking
                    </button>
                  )}

                  {answers[currentQuestionIndex] && (
                    <span className="answer-status">✅ Answered</span>
                  )}
                </div>

                <div className="answer-area">
                  <label>Your Answer:</label>
                  <div className="answer-transcript">
                    {answers[currentQuestionIndex] || (isPaused ? '⏸️ Session Paused' : 'Speak to answer...')}
                  </div>
                </div>

                {/* Session Controls */}
                <div className="session-controls">
                  <div className="session-timer">
                    <i className="fas fa-clock"></i>
                    <span>{formatTime(sessionTime)}</span>
                  </div>
                  <div className="control-buttons">
                    {isPaused ? (
                      <button 
                        className="btn btn-success"
                        onClick={onResumeSession}
                      >
                        <i className="fas fa-play"></i> Resume
                      </button>
                    ) : (
                      <button 
                        className="btn btn-warning"
                        onClick={onPauseSession}
                        disabled={!interviewStarted || sessionStatus === 'ended' || sessionStatus === 'completed'}
                      >
                        <i className="fas fa-pause"></i> Pause
                      </button>
                    )}
                    <button 
                      className="btn btn-danger"
                      onClick={handleEndWithRecording}
                      disabled={!interviewStarted || sessionStatus === 'ended' || sessionStatus === 'completed'}
                    >
                      <i className="fas fa-stop"></i> End Session
                    </button>
                  </div>
                </div>

                {/* Question Navigation */}
                <div className="question-nav">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      if (isListening) stopListening();
                      if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
                    }}
                    disabled={currentQuestionIndex === 0 || isPaused || sessionStatus === 'ended' || sessionStatus === 'completed'}
                  >
                    ← Previous
                  </button>
                  
                  {currentQuestionIndex < generatedQuestions.length - 1 && sessionStatus !== 'ended' && sessionStatus !== 'completed' ? (
                    <button 
                      className="btn btn-primary"
                      onClick={handleNextQuestion}
                      disabled={!answers[currentQuestionIndex] || isListening || isSpeaking || isPaused}
                    >
                      Next →
                    </button>
                  ) : null}
                  
                  <button 
                    className="btn btn-success"
                    onClick={handleSubmitWithRecording}
                    disabled={submitting || answers.length < generatedQuestions.length}
                  >
                    {submitting ? '⏳ Submitting...' : '📤 Submit Interview'}
                  </button>

                  <button 
                    className="btn btn-warning"
                    onClick={() => {
                      const answeredCount = answers.filter(a => a && a.trim() !== '').length;
                      const totalQuestions = generatedQuestions ? generatedQuestions.length : 0;
                      
                      if (answeredCount < totalQuestions) {
                        if (window.confirm(`You have only answered ${answeredCount}/${totalQuestions} questions.\n\nAre you sure you want to submit partial answers?`)) {
                          handleForceSubmitInterview();
                        }
                      } else {
                        handleSubmitWithRecording();
                      }
                    }}
                    disabled={submitting || sessionStatus === 'completed'}
                  >
                    {submitting ? '⏳ Submitting...' : '📤 Submit Partial'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewTab;