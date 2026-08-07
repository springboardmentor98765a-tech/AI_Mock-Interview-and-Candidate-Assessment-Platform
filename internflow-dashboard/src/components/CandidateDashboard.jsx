import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../styles/CandidateDashboard.css';
import CandidateSidebar from './CandidateSidebar';
import DashboardTab from './tabs/DashboardTab';
import ResumeTab from './tabs/ResumeTab';
import InterviewTab from './tabs/InterviewTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import HistoryTab from './tabs/HistoryTab';


// Add this for better speech recognition
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognitionAPI ? new SpeechRecognitionAPI() : null;

// Configure recognition
if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
}

const CandidateDashboard = ({ user }) => {
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
    interview_type: 'technical',
    domain: 'react',
    difficulty: 'medium',
    questionCount: 5
  });

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // =============================================
  // SPEECH FUNCTIONS
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
  resetTranscript();
  setIsListening(true);
  SpeechRecognition.startListening({
    continuous: true,
    language: 'en-US',
    interimResults: true,
    maxAlternatives: 1
  });
  
  // Auto-stop after 60 seconds to prevent timeout
  setTimeout(() => {
    if (isListening) {
      stopListening();
    }
  }, 60000);
};

  const stopListening = () => {
    SpeechRecognition.stopListening();
    setIsListening(false);
    if (transcript) {
      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = transcript;
      setAnswers(newAnswers);
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

  const handleSubmitInterview = async () => {
  if (!generatedQuestions) return;
  if (answers.length < generatedQuestions.length) {
    alert('Please answer all questions before submitting.');
    return;
  }

  window.speechSynthesis.cancel();
  if (isListening) stopListening();

  setSubmitting(true);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/interviews', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const allInterviews = await response.json();
    const latestInterview = allInterviews[0];

    if (!latestInterview) {
      alert('No interview found to submit.');
      return;
    }

    const submitResponse = await fetch(`http://localhost:5000/api/interviews/submit/${latestInterview.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ answers: answers })
    });

    const data = await submitResponse.json();
    if (submitResponse.ok) {
      // Format the feedback message
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
      
      setGeneratedQuestions(null);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setInterviewStarted(false);
      setShowNewInterview(false);
      fetchInterviews();
    } else {
      alert(data.error || 'Failed to submit interview');
    }
  } catch (error) {
    console.error('Error submitting interview:', error);
  } finally {
    setSubmitting(false);
  }
};

  const handleNextQuestion = () => {
    if (isListening) stopListening();
    if (currentQuestionIndex < generatedQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setTimeout(() => speakQuestion(generatedQuestions[nextIndex].question), 500);
    }
  };

  const viewInterviewDetails = (interview) => {
    setSelectedInterview(interview);
    setActiveTab('history');
  };

  const closeDetails = () => setSelectedInterview(null);

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

  const getStatusBadge = (status) => {
    const badges = {
      'pending': 'badge-pending',
      'in_progress': 'badge-progress',
      'completed': 'badge-completed'
    };
    return badges[status] || 'badge-pending';
  };

  useEffect(() => {
    fetchInterviews();
    return () => {
      SpeechRecognition.stopListening();
      window.speechSynthesis.cancel();
    };
  }, []);

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
            handleNextQuestion={handleNextQuestion}
            loading={loading}
            submitting={submitting}
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
      </div>
    </div>
  );
};

export default CandidateDashboard;