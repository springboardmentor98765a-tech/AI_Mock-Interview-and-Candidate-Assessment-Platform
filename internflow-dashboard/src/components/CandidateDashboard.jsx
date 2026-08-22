import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../styles/CandidateDashboard.css';
import CandidateSidebar from './CandidateSidebar';
import DashboardTab from './tabs/DashboardTab';
import ResumeTab from './tabs/ResumeTab';
import InterviewTab from './tabs/InterviewTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import HistoryTab from './tabs/HistoryTab';
import RecordingsTab from './tabs/RecordingsTab';

const CandidateDashboard = ({ user }) => {
  // =============================================
  // STATE VARIABLES
  // =============================================
  const [activeTab, setActiveTab] = useState('dashboard');
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewInterview, setShowNewInterview] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [generatedQuestions, setGeneratedQuestions] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  
  // Resume state
  const [resumeScore, setResumeScore] = useState(88);
  const [keywordMatch, setKeywordMatch] = useState(94);
  const [formattingScore, setFormattingScore] = useState(88);
  
  // Form states
  const [formData, setFormData] = useState({
    interview_type: 'tr',
    domain: 'sde',
    difficulty: 'medium',
    questionCount: 5
  });

  // =============================================
  // SESSION MANAGEMENT STATE
  // =============================================
  const [sessionTime, setSessionTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('pending');
  const [interviewId, setInterviewId] = useState(null);

  // =============================================
  // SPEECH RECOGNITION
  // =============================================
  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // =============================================
  // SESSION MANAGEMENT FUNCTIONS
  // =============================================
  
  // Format time (seconds to MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Start timer
  const startTimer = () => {
    if (timerInterval) clearInterval(timerInterval);
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  };

  // Pause timer
  const pauseTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // Resume timer
  const resumeTimer = () => {
    if (!timerInterval) {
      const interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    }
  };

  // Reset timer
  const resetTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setSessionTime(0);
  };

  // =============================================
  // SPEECH FUNCTIONS - FIXED FOR FULL TRANSCRIPTION
  // =============================================
  const speakQuestion = (question) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(question);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.lang = 'en-US';
      utterance.onend = () => {
        setIsSpeaking(false);
        if (interviewStarted) startListening();
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    console.log('🎤 Starting listening...');
    resetTranscript();
    setIsListening(true);
    
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition. Please use Chrome.');
      setIsListening(false);
      return;
    }
    
    // Use the SpeechRecognition directly for better control
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    let finalTranscript = '';
    
    recognition.onresult = function(event) {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update the transcript with both final and interim
      const currentTranscript = finalTranscript + interimTranscript;
      console.log('📝 Current transcript:', currentTranscript);
      
      // Update the answer in real-time
      if (currentTranscript.trim()) {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = currentTranscript.trim();
        setAnswers(newAnswers);
      }
    };
    
    recognition.onerror = function(event) {
      console.error('❌ Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Please allow microphone access to use voice features.');
      }
      setIsListening(false);
    };
    
    recognition.onend = function() {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
      // Save final transcript
      if (finalTranscript.trim()) {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = finalTranscript.trim();
        setAnswers(newAnswers);
        console.log('✅ Final answer saved:', finalTranscript.trim());
      }
    };
    
    // Store recognition instance to stop it later
    window.currentRecognition = recognition;
    
    recognition.start();
    console.log('✅ Listening started successfully');
    
    // Auto-stop after 120 seconds (2 minutes) instead of 60
    setTimeout(() => {
      if (window.currentRecognition) {
        console.log('⏱️ Auto-stopping listening after 120 seconds');
        window.currentRecognition.stop();
        setIsListening(false);
      }
    }, 120000);
  };

  const stopListening = () => {
    console.log('⏹️ Stopping listening...');
    if (window.currentRecognition) {
      try {
        window.currentRecognition.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
      window.currentRecognition = null;
    }
    setIsListening(false);
    
    // Save whatever transcript we have
    if (transcript && transcript.trim()) {
      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = transcript.trim();
      setAnswers(newAnswers);
      console.log('✅ Answer saved:', transcript.trim());
    }
  };

  // =============================================
  // START INTERVIEW SESSION
  // =============================================
  const handleStartSession = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/interviews/${id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setSessionStatus('in_progress');
        setIsPaused(false);
        startTimer();
        setActiveSession(data.interview);
        console.log('✅ Session started:', data);
      } else {
        alert(data.error || 'Failed to start session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // =============================================
  // PAUSE SESSION
  // =============================================
  const handlePauseSession = async () => {
    if (!activeSession) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/interviews/${activeSession.id}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setIsPaused(true);
        pauseTimer();
        setSessionStatus('paused');
        console.log('⏸️ Session paused');
      } else {
        alert(data.error || 'Failed to pause session');
      }
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  };

  // =============================================
  // RESUME SESSION
  // =============================================
  const handleResumeSession = async () => {
    if (!activeSession) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/interviews/${activeSession.id}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setIsPaused(false);
        resumeTimer();
        setSessionStatus('in_progress');
        console.log('▶️ Session resumed');
      } else {
        alert(data.error || 'Failed to resume session');
      }
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  };

  // =============================================
  // END SESSION
  // =============================================
  const handleEndSession = async () => {
    if (!activeSession) return;
    
    if (!window.confirm('Are you sure you want to end this session?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/interviews/${activeSession.id}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        const finalTime = sessionTime;
        resetTimer();
        setSessionStatus('ended');
        setIsPaused(false);
        setActiveSession(null);
        
        // Show message and keep the submit button visible
        const answeredCount = answers.filter(a => a && a.trim() !== '').length;
        const totalQuestions = generatedQuestions ? generatedQuestions.length : 0;
        
        if (answeredCount < totalQuestions) {
          alert(`⏹️ Session ended!\n\nDuration: ${formatTime(finalTime)}\n\nYou have answered ${answeredCount}/${totalQuestions} questions.\n\nPlease review your answers and click "Submit Interview" to complete.`);
        } else {
          // Auto-submit if all questions are answered
          setTimeout(() => {
            handleSubmitInterview();
          }, 1000);
        }
        
        console.log('⏹️ Session ended');
        fetchInterviews();
      } else {
        alert(data.error || 'Failed to end session');
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // =============================================
  // API CALLS
  // =============================================
  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/interviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setInterviews(data);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // GENERATE INTERVIEW
  // =============================================
  const handleGenerateInterview = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/interviews/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setGeneratedQuestions(data.questions);
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setInterviewStarted(false);
        setInterviewId(data.interview.id);
        setSessionStatus('pending');
        setActiveTab('interview');
        fetchInterviews();
      } else {
        alert(data.error || 'Failed to generate interview');
      }
    } catch (error) {
      console.error('Error generating interview:', error);
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // SUBMIT INTERVIEW - FIXED VERSION
  // =============================================
  const handleSubmitInterview = async () => {
    console.log('🔍 Submit Interview Called');
    console.log('📊 generatedQuestions:', generatedQuestions);
    console.log('📝 answers:', answers);
    console.log('🎯 interviewId:', interviewId);
    console.log('🔄 activeSession:', activeSession);
    console.log('📌 sessionStatus:', sessionStatus);

    // Check if we have questions to submit
    if (!generatedQuestions || generatedQuestions.length === 0) {
      alert('No interview questions to submit.');
      return;
    }

    // Check if all questions are answered
    const answeredCount = answers.filter(a => a && a.trim() !== '').length;
    console.log('📊 Answered count:', answeredCount, 'Total:', generatedQuestions.length);
    
    if (answeredCount < generatedQuestions.length) {
      alert(`Please answer all ${generatedQuestions.length} questions before submitting. You have answered ${answeredCount}.`);
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    if (isListening) {
      stopListening();
    }

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      
      if (!token) {
        alert('Please login again.');
        setSubmitting(false);
        return;
      }
      
      // Get the interview ID
      let interviewIdToSubmit = interviewId;
      console.log('📌 Using interviewId:', interviewIdToSubmit);
      
      // If we have an active session, use its ID
      if (activeSession && activeSession.id) {
        interviewIdToSubmit = activeSession.id;
        console.log('📌 Using activeSession ID:', interviewIdToSubmit);
      }
      
      // If no interview ID, fetch the latest interview
      if (!interviewIdToSubmit) {
        console.log('📌 No interviewId, fetching from API...');
        const response = await fetch('http://localhost:5000/api/interviews', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const allInterviews = await response.json();
        console.log('📌 All interviews:', allInterviews);
        
        if (allInterviews && allInterviews.length > 0) {
          interviewIdToSubmit = allInterviews[0].id;
          console.log('📌 Found interview ID from API:', interviewIdToSubmit);
        } else {
          alert('No interview found to submit.');
          setSubmitting(false);
          return;
        }
      }

      console.log('📤 Submitting interview:', interviewIdToSubmit);
      console.log('📝 Answers being sent:', answers);

      const submitResponse = await fetch(`http://localhost:5000/api/interviews/submit/${interviewIdToSubmit}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: answers })
      });

      console.log('📊 Submit response status:', submitResponse.status);
      const data = await submitResponse.json();
      console.log('📊 Submit response data:', data);
      
      if (submitResponse.ok) {
        let feedbackMessage = `🎉 Interview Submitted!\n\n`;
        feedbackMessage += `📊 Score: ${data.score}%\n\n`;
        
        if (data.feedback) {
          if (typeof data.feedback === 'string') {
            feedbackMessage += `📝 Feedback: ${data.feedback}`;
          } else {
            feedbackMessage += `📝 Feedback:\n`;
            if (data.feedback.technical_summary) {
              feedbackMessage += `• ${data.feedback.technical_summary}\n`;
            }
            if (data.feedback.communication_summary) {
              feedbackMessage += `• ${data.feedback.communication_summary}\n`;
            }
            if (data.feedback.final_verdict) {
              feedbackMessage += `\n🎯 ${data.feedback.final_verdict}`;
            }
          }
        }
        
        alert(feedbackMessage);
        
        // Reset all states
        setGeneratedQuestions(null);
        setAnswers([]);
        setCurrentQuestionIndex(0);
        setInterviewStarted(false);
        setShowNewInterview(false);
        resetTimer();
        setSessionStatus('completed');
        setActiveSession(null);
        setInterviewId(null);
        
        // Refresh interviews list
        fetchInterviews();
      } else {
        console.error('❌ Submit failed:', data);
        alert(data.error || 'Failed to submit interview. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error submitting interview:', error);
      alert('Failed to submit interview. Error: ' + error.message);
    } finally {
      setSubmitting(false);
      console.log('✅ Submit finished');
    }
  };

  // =============================================
  // FORCE SUBMIT INTERVIEW - Submit even if incomplete
  // =============================================
  const handleForceSubmitInterview = async () => {
    console.log('🔍 Force Submit Called');
    
    // Check if we have questions
    if (!generatedQuestions || generatedQuestions.length === 0) {
      alert('No interview questions to submit.');
      return;
    }

    // Get answered count
    const answeredCount = answers.filter(a => a && a.trim() !== '').length;
    const totalQuestions = generatedQuestions.length;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    if (isListening) {
      stopListening();
    }

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please login again.');
        setSubmitting(false);
        return;
      }
      
      // Get the interview ID
      let interviewIdToSubmit = interviewId;
      
      if (activeSession && activeSession.id) {
        interviewIdToSubmit = activeSession.id;
      }
      
      if (!interviewIdToSubmit) {
        const response = await fetch('http://localhost:5000/api/interviews', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const allInterviews = await response.json();
        if (allInterviews && allInterviews.length > 0) {
          interviewIdToSubmit = allInterviews[0].id;
        } else {
          alert('No interview found to submit.');
          setSubmitting(false);
          return;
        }
      }

      console.log('📤 Submitting partial interview:', interviewIdToSubmit);
      console.log('📝 Answers being sent:', answers);

      // Add a flag to indicate partial submission
      const submitData = {
        answers: answers,
        is_partial: true,
        answered_count: answeredCount,
        total_questions: totalQuestions
      };

      const submitResponse = await fetch(`http://localhost:5000/api/interviews/submit/${interviewIdToSubmit}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await submitResponse.json();
      
      if (submitResponse.ok) {
        let feedbackMessage = `🎉 Interview Submitted (Partial)!\n\n`;
        feedbackMessage += `📊 Score: ${data.score}%\n`;
        feedbackMessage += `📝 Answered: ${answeredCount}/${totalQuestions} questions\n\n`;
        
        if (data.feedback) {
          if (typeof data.feedback === 'string') {
            feedbackMessage += `📝 Feedback: ${data.feedback}`;
          } else {
            feedbackMessage += `📝 Feedback:\n`;
            if (data.feedback.technical_summary) {
              feedbackMessage += `• ${data.feedback.technical_summary}\n`;
            }
            if (data.feedback.final_verdict) {
              feedbackMessage += `\n🎯 ${data.feedback.final_verdict}`;
            }
          }
        }
        
        alert(feedbackMessage);
        
        // Reset all states
        setGeneratedQuestions(null);
        setAnswers([]);
        setCurrentQuestionIndex(0);
        setInterviewStarted(false);
        setShowNewInterview(false);
        resetTimer();
        setSessionStatus('completed');
        setActiveSession(null);
        setInterviewId(null);
        
        // Refresh interviews list
        fetchInterviews();
      } else {
        alert(data.error || 'Failed to submit interview');
      }
    } catch (error) {
      console.error('❌ Error submitting interview:', error);
      alert('Failed to submit interview. Error: ' + error.message);
    } finally {
      setSubmitting(false);
      console.log('✅ Force submit finished');
    }
  };

  // =============================================
  // NEXT QUESTION
  // =============================================
  const handleNextQuestion = () => {
    if (isListening) stopListening();
    if (currentQuestionIndex < generatedQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setTimeout(() => speakQuestion(generatedQuestions[nextIndex].question), 500);
    }
  };

  // =============================================
  // VIEW INTERVIEW DETAILS
  // =============================================
  const viewInterviewDetails = (interview) => {
    setSelectedInterview(interview);
    setActiveTab('history');
  };

  const closeDetails = () => setSelectedInterview(null);

  // =============================================
  // RESUME UPLOAD
  // =============================================
  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const newScore = Math.floor(Math.random() * 30) + 70;
      const newKeyword = Math.floor(Math.random() * 20) + 80;
      const newFormat = Math.floor(Math.random() * 20) + 75;
      
      setResumeScore(newScore);
      setKeywordMatch(newKeyword);
      setFormattingScore(newFormat);
      
      alert(`✅ Resume "${file.name}" uploaded!\nScore: ${newScore}%\nATS Match: ${newFormat}%`);
    }
  };

  // =============================================
  // GET STATUS BADGE
  // =============================================
  const getStatusBadge = (status) => {
    const badges = {
      'pending': 'badge-pending',
      'in_progress': 'badge-progress',
      'completed': 'badge-completed',
      'paused': 'badge-paused',
      'ended': 'badge-ended'
    };
    return badges[status] || 'badge-pending';
  };

  // =============================================
  // CHECK ACTIVE SESSION ON LOAD
  // =============================================
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/interviews/active', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.session && data.session.status === 'in_progress') {
          setActiveSession(data.session);
          setSessionStatus('in_progress');
          startTimer();
        }
      } catch (error) {
        console.error('Error checking active session:', error);
      }
    };
    
    fetchInterviews();
    checkActiveSession();
    
    return () => {
      SpeechRecognition.stopListening();
      window.speechSynthesis.cancel();
      if (timerInterval) clearInterval(timerInterval);
    };
  }, []);

  // =============================================
  // BROWSER SUPPORT CHECK
  // =============================================
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="candidate-dashboard">
        <div className="container mt-5">
          <div className="alert alert-warning text-center py-5">
            <h3>⚠️ Browser Not Supported</h3>
            <p>Please use Google Chrome or Edge for voice features.</p>
          </div>
        </div>
      </div>
    );
  }

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="candidate-dashboard">
      <CandidateSidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      
      <div className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardTab user={user} interviews={interviews} resumeScore={resumeScore} />
        )}
        
        {activeTab === 'resume' && (
          <ResumeTab 
            resumeScore={resumeScore}
            keywordMatch={keywordMatch}
            formattingScore={formattingScore}
            onResumeUpload={handleResumeUpload}
          />
        )}
        
        {activeTab === 'interview' && (
          <InterviewTab
            showNewInterview={showNewInterview}
            setShowNewInterview={setShowNewInterview}
            generatedQuestions={generatedQuestions}
            interviewStarted={interviewStarted}
            setInterviewStarted={setInterviewStarted}
            currentQuestionIndex={currentQuestionIndex}
            setCurrentQuestionIndex={setCurrentQuestionIndex}
            answers={answers}
            setAnswers={setAnswers}
            formData={formData}
            setFormData={setFormData}
            isSpeaking={isSpeaking}
            isListening={isListening}
            speakQuestion={speakQuestion}
            startListening={startListening}
            stopListening={stopListening}
            handleGenerateInterview={handleGenerateInterview}
            handleSubmitInterview={handleSubmitInterview}
            handleForceSubmitInterview={handleForceSubmitInterview}
            handleNextQuestion={handleNextQuestion}
            loading={loading}
            submitting={submitting}
            sessionTime={sessionTime}
            isPaused={isPaused}
            formatTime={formatTime}
            onStartSession={handleStartSession}
            onPauseSession={handlePauseSession}
            onResumeSession={handleResumeSession}
            onEndSession={handleEndSession}
            activeSession={activeSession}
            sessionStatus={sessionStatus}
            interviewId={interviewId}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsTab interviews={interviews} />
        )}
        
        {activeTab === 'history' && (
          <HistoryTab 
            interviews={interviews} 
            viewInterviewDetails={viewInterviewDetails}
            selectedInterview={selectedInterview}
            closeDetails={closeDetails}
            getStatusBadge={getStatusBadge}
          />
        )}

        {/* Add this */}
{activeTab === 'recordings' && (
  <RecordingsTab user={user} />
)}
      </div>
    </div>
  );
};

export default CandidateDashboard;