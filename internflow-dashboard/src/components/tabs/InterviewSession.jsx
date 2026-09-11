import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPlay, FaPause, FaStop, FaUndo, FaClock, FaQuestionCircle } from 'react-icons/fa';

const InterviewSession = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('not-started');
  const [timer, setTimer] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  
  const timerRef = useRef(null);
  const questionTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setAnswer(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
    }
  }, []);

  // Create session
  const createSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5001/api/sessions/create',
        {
          interviewId,
          totalQuestions: 5 // You can make this dynamic
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      sessionIdRef.current = response.data.session.id;
      setSession(response.data.session);
      setSessionStatus('not-started');
      setLoading(false);
      
      // Start session immediately
      startSession(response.data.session.id);
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session');
      setLoading(false);
    }
  };

  // Start session
  const startSession = async (sessionId = sessionIdRef.current) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5001/api/sessions/${sessionId}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSession(response.data.session);
      setSessionStatus('in-progress');
      setLoading(false);
      
      // Start timers
      startTimers();
      
      // Get first question
      getCurrentQuestion(sessionId);
    } catch (error) {
      console.error('Error starting session:', error);
      setError('Failed to start session');
      setLoading(false);
    }
  };

  // Pause session
  const pauseSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5001/api/sessions/${sessionIdRef.current}/pause`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSession(response.data.session);
      setSessionStatus('paused');
      stopTimers();
      stopRecording();
      setLoading(false);
    } catch (error) {
      console.error('Error pausing session:', error);
      setError('Failed to pause session');
      setLoading(false);
    }
  };

  // Resume session
  const resumeSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5001/api/sessions/${sessionIdRef.current}/resume`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSession(response.data.session);
      setSessionStatus('in-progress');
      startTimers();
      setLoading(false);
      
      // Get current question
      getCurrentQuestion(sessionIdRef.current);
    } catch (error) {
      console.error('Error resuming session:', error);
      setError('Failed to resume session');
      setLoading(false);
    }
  };

  // End session
  const endSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5001/api/sessions/${sessionIdRef.current}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSession(response.data.session);
      setSessionStatus('completed');
      stopTimers();
      stopRecording();
      setLoading(false);
      
      // Get session summary
      getSummary(sessionIdRef.current);
    } catch (error) {
      console.error('Error ending session:', error);
      setError('Failed to end session');
      setLoading(false);
    }
  };

  // Get current question
  const getCurrentQuestion = async (sessionId = sessionIdRef.current) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5001/api/sessions/${sessionId}/current-question`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCurrentQuestion(response.data.question);
      setCurrentIndex(response.data.currentIndex);
      setTotalQuestions(response.data.totalQuestions);
      setAnswer('');
      
      // Reset question timer
      setQuestionTimer(0);
      
      // Start question timer
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      questionTimerRef.current = setInterval(() => {
        setQuestionTimer(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error getting current question:', error);
      if (error.response?.data?.message === 'All questions have been answered') {
        // Auto-end session if all questions answered
        endSession();
      }
    }
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!answer.trim()) {
      alert('Please provide an answer');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5001/api/sessions/${sessionIdRef.current}/submit-answer`,
        { answer },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLoading(false);
      
      if (response.data.isComplete) {
        // Session completed
        setSessionStatus('completed');
        stopTimers();
        stopRecording();
        getSummary(sessionIdRef.current);
      } else {
        // Get next question
        getCurrentQuestion(sessionIdRef.current);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer');
      setLoading(false);
    }
  };

  // Get session summary
  const getSummary = async (sessionId = sessionIdRef.current) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5001/api/sessions/${sessionId}/summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSummary(response.data);
    } catch (error) {
      console.error('Error getting summary:', error);
    }
  };

  // Timer functions
  const startTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const stopTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
  };

  // Recording functions
  const startRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsRecording(false);
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render session controls
  const renderControls = () => {
    switch (sessionStatus) {
      case 'not-started':
        return (
          <button
            className="btn btn-primary btn-lg"
            onClick={createSession}
            disabled={loading}
          >
            <FaPlay className="me-2" />
            Start Interview
          </button>
        );
      case 'in-progress':
        return (
          <div className="d-flex gap-3">
            <button
              className="btn btn-warning"
              onClick={pauseSession}
              disabled={loading}
            >
              <FaPause className="me-2" />
              Pause
            </button>
            <button
              className="btn btn-danger"
              onClick={endSession}
              disabled={loading}
            >
              <FaStop className="me-2" />
              End Session
            </button>
          </div>
        );
      case 'paused':
        return (
          <div className="d-flex gap-3">
            <button
              className="btn btn-success"
              onClick={resumeSession}
              disabled={loading}
            >
              <FaPlay className="me-2" />
              Resume
            </button>
            <button
              className="btn btn-danger"
              onClick={endSession}
              disabled={loading}
            >
              <FaStop className="me-2" />
              End Session
            </button>
          </div>
        );
      case 'completed':
        return (
          <div className="alert alert-success">
            <h4>✅ Interview Completed!</h4>
            <button
              className="btn btn-primary mt-3"
              onClick={() => navigate('/candidate/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  // Render question
  const renderQuestion = () => {
    if (!currentQuestion || sessionStatus === 'completed') return null;

    return (
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">
            <FaQuestionCircle className="me-2" />
            Question {currentIndex + 1} of {totalQuestions}
          </h5>
        </div>
        <div className="card-body">
          <h4 className="mb-3">{currentQuestion.question}</h4>
          
          {currentQuestion.expectedAnswer && (
            <div className="mb-3">
              <small className="text-muted">Hint: {currentQuestion.expectedAnswer}</small>
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">Your Answer:</label>
            <div className="d-flex gap-2 mb-2">
              <button
                className={`btn ${isRecording ? 'btn-danger' : 'btn-outline-primary'}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={sessionStatus !== 'in-progress'}
              >
                {isRecording ? '⏹ Stop Recording' : '🎤 Start Recording'}
              </button>
            </div>
            <textarea
              className="form-control"
              rows="4"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer or use voice input..."
              disabled={sessionStatus !== 'in-progress'}
            />
          </div>

          <button
            className="btn btn-success"
            onClick={submitAnswer}
            disabled={loading || sessionStatus !== 'in-progress'}
          >
            {loading ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      </div>
    );
  };

  // Render summary
  const renderSummary = () => {
    if (!summary) return null;

    return (
      <div className="card mt-4">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0">📊 Session Summary</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <div className="text-center">
                <h6>Total Questions</h6>
                <h3>{summary.totalQuestions}</h3>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <h6>Answered</h6>
                <h3>{summary.answeredQuestions}</h3>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <h6>Total Duration</h6>
                <h3>{formatTime(summary.totalDurationSeconds)}</h3>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <h6>Avg Time/Question</h6>
                <h3>{formatTime(summary.averageTimePerQuestion)}</h3>
              </div>
            </div>
          </div>
          
          <hr />
          
          <h6>Question Details:</h6>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Time Taken</th>
                </tr>
              </thead>
              <tbody>
                {summary.answers.map((ans, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{ans.question?.substring(0, 50)}...</td>
                    <td>{formatTime(ans.duration || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimers();
      stopRecording();
    };
  }, []);

  return (
    <div className="interview-session">
      <div className="container-fluid">
        <h2 className="mb-4">🎯 Interview Session</h2>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show">
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError(null)}
            ></button>
          </div>
        )}

        {/* Session Status */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Session Status</h5>
                <div className="d-flex justify-content-between align-items-center">
                  <span className={`badge ${
                    sessionStatus === 'in-progress' ? 'bg-success' :
                    sessionStatus === 'paused' ? 'bg-warning' :
                    sessionStatus === 'completed' ? 'bg-info' :
                    'bg-secondary'
                  }`}>
                    {sessionStatus.toUpperCase()}
                  </span>
                  <div>
                    <FaClock className="me-2" />
                    <strong>Time: {formatTime(timer)}</strong>
                  </div>
                  {sessionStatus === 'in-progress' && (
                    <div>
                      <small>Question Time: {formatTime(questionTimer)}</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  {renderControls()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {sessionStatus !== 'not-started' && sessionStatus !== 'completed' && (
          <div className="mb-4">
            <div className="progress">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                style={{ width: `${(currentIndex / totalQuestions) * 100}%` }}
              >
                {Math.round((currentIndex / totalQuestions) * 100)}%
              </div>
            </div>
            <small className="text-muted">
              Progress: {currentIndex} of {totalQuestions} questions answered
            </small>
          </div>
        )}

        {/* Question */}
        {sessionStatus !== 'not-started' && renderQuestion()}

        {/* Summary */}
        {summary && renderSummary()}
      </div>

      <style jsx>{`
        .interview-session {
          padding: 20px 0;
        }
        .progress {
          height: 25px;
        }
        .btn-lg {
          padding: 12px 30px;
        }
        textarea {
          resize: vertical;
        }
      `}</style>
    </div>
  );
};

export default InterviewSession;