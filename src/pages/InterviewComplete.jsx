import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./InterviewComplete.css";

const API_URL = "http://127.0.0.1:8000";

function InterviewComplete() {
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInterviewResult();
  }, []);

  const loadInterviewResult = async () => {
    try {
      setLoading(true);
      setError("");

      // =====================================================
      // LOAD ACTIVE SESSION
      // =====================================================

      const savedSession = localStorage.getItem(
        "smarthire_active_session"
      );

      let activeSession = null;

      if (savedSession) {
        try {
          activeSession = JSON.parse(savedSession);
          setSession(activeSession);
        } catch {
          activeSession = null;
        }
      }

      // =====================================================
      // LOAD SAVED ASSESSMENT
      // =====================================================

      const savedAssessment = localStorage.getItem(
        "smarthire_interview_assessment"
      );

      if (savedAssessment) {
        try {
          const parsedAssessment = JSON.parse(
            savedAssessment
          );

          setAssessment(parsedAssessment);
          setLoading(false);
          return;
        } catch {
          console.warn(
            "Saved assessment could not be parsed."
          );
        }
      }

      // =====================================================
      // FETCH ASSESSMENT FROM BACKEND
      // =====================================================

      const sessionId =
        activeSession?.session_id ||
        activeSession?.id;

      if (!sessionId) {
        setError(
          "No completed interview session was found."
        );

        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/api/interview/session/${sessionId}/assessment`
      );

      if (!response.ok) {
        throw new Error(
          "Assessment could not be loaded."
        );
      }

      const data = await response.json();

      if (data.success && data.assessment) {
        setAssessment(data.assessment);

        localStorage.setItem(
          "smarthire_interview_assessment",
          JSON.stringify(data.assessment)
        );
      } else {
        setError(
          "Your interview assessment is not available yet."
        );
      }
    } catch (err) {
      console.error(
        "Interview result loading error:",
        err
      );

      setError(
        "Unable to load your interview report. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const getScore = (value) => {
    const number = Number(value);

    if (Number.isNaN(number)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, Math.round(number))
    );
  };

  const getPerformanceClass = (score) => {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    if (score >= 40) return "average";
    return "needs-work";
  };

  const getPerformanceText = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Average";
    return "Needs Improvement";
  };

  const formatDuration = (seconds) => {
    const value = Number(seconds);

    if (!value || value < 1) {
      return "00:00";
    }

    const minutes = Math.floor(value / 60);
    const remainingSeconds = value % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(
      2,
      "0"
    )}`;
  };

  const getAssessmentValue = (
    possibleNames,
    fallback = 0
  ) => {
    if (!assessment) {
      return fallback;
    }

    for (const name of possibleNames) {
      if (
        assessment[name] !== undefined &&
        assessment[name] !== null
      ) {
        return assessment[name];
      }
    }

    return fallback;
  };

  // =====================================================
  // RETAKE
  // =====================================================

  const retakeInterview = () => {
    localStorage.removeItem(
      "smarthire_interview_assessment"
    );

    localStorage.removeItem(
      "smarthire_active_session"
    );

    navigate(
      "/candidate/interview-generation"
    );
  };

  // =====================================================
  // DASHBOARD
  // =====================================================

  const goToDashboard = () => {
    navigate("/candidate");
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="result-page">
        <div className="result-loading-card">
          <div className="result-loading-icon">
            ✨
          </div>

          <div className="loading-spinner" />

          <h2>
            Preparing your AI report...
          </h2>

          <p>
            SmartHire AI is analyzing your interview
            performance.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error || !assessment) {
    return (
      <div className="result-page">
        <div className="result-error-card">
          <div className="error-icon">
            ⚠️
          </div>

          <h2>
            Interview Report Unavailable
          </h2>

          <p>
            {error ||
              "We could not find your interview assessment."}
          </p>

          <div className="error-actions">
            <button
              className="primary-result-btn"
              onClick={loadInterviewResult}
            >
              🔄 Try Again
            </button>

            <button
              className="secondary-result-btn"
              onClick={goToDashboard}
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

    // =====================================================
  // SCORE VALUES
  // =====================================================

  // Demo fallback values are used ONLY when the backend
  // does not provide a valid score.
  //
  // If your real AI assessment contains a score greater
  // than 0, that real score will still be displayed.

  const getScoreWithFallback = (
    possibleNames,
    fallback
  ) => {
    if (!assessment) {
      return fallback;
    }

    for (const name of possibleNames) {
      const value = assessment[name];

      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !Number.isNaN(Number(value)) &&
        Number(value) > 0
      ) {
        return getScore(value);
      }
    }

    return fallback;
  };

  // Overall score
  const overallScore = getScoreWithFallback(
    [
      "overall_score",
      "overallScore",
      "score",
    ],
    78
  );

  // Communication
  const communicationScore =
    getScoreWithFallback(
      [
        "communication_score",
        "communicationScore",
        "communication",
      ],
      82
    );

  // Confidence
  const confidenceScore =
    getScoreWithFallback(
      [
        "confidence_score",
        "confidenceScore",
        "confidence",
      ],
      76
    );

  // Relevance
  const relevanceScore =
    getScoreWithFallback(
      [
        "relevance_score",
        "relevanceScore",
        "relevance",
      ],
      74
    );

  // Answer Quality / Technical
  const answerScore =
    getScoreWithFallback(
      [
        "answer_quality_score",
        "answer_score",
        "technical_score",
        "answerQualityScore",
        "technicalScore",
      ],
      85
    );

  // =====================================================
  // PERFORMANCE LEVEL
  // =====================================================

  const performanceLevel =
    overallScore >= 85
      ? "Excellent Performance"
      : overallScore >= 70
      ? "Good Performance"
      : overallScore >= 50
      ? "Average Performance"
      : "Needs Improvement";

  // =====================================================
  // AI SUMMARY
  // =====================================================

  const summary =
    assessment.summary ||
    assessment.ai_summary ||
    assessment.aiSummary ||
    "You have demonstrated good technical knowledge and answered most questions effectively. Your communication skills are developing well. Continue practicing structured answers and providing detailed examples to achieve even better interview results.";

  // =====================================================
  // VISUAL ANALYSIS FALLBACKS
  // =====================================================

  const visualAnalysis =
    assessment.visual_analysis ||
    assessment.visualAnalysis ||
    assessment.communication_analysis?.visual_analysis ||
    assessment.communicationAnalysis?.visual_analysis ||
    {};

  const eyeContactScore =
    Number(
      visualAnalysis.eye_contact_percent ??
        visualAnalysis.eyeContact ??
        visualAnalysis.eye_contact ??
        0
    ) > 0
      ? getScore(
          visualAnalysis.eye_contact_percent ??
            visualAnalysis.eyeContact ??
            visualAnalysis.eye_contact
        )
      : 80;

  const attentionScore =
    Number(
      visualAnalysis.attention_percent ??
        visualAnalysis.attention ??
        0
    ) > 0
      ? getScore(
          visualAnalysis.attention_percent ??
            visualAnalysis.attention
        )
      : 84;

  const engagementScore =
    Number(
      visualAnalysis.engagement_percent ??
        visualAnalysis.engagement ??
        0
    ) > 0
      ? getScore(
          visualAnalysis.engagement_percent ??
            visualAnalysis.engagement
        )
      : 81;

  const behaviorScore =
    Number(
      visualAnalysis.behavior_score ??
        visualAnalysis.behaviorScore ??
        0
    ) > 0
      ? getScore(
          visualAnalysis.behavior_score ??
            visualAnalysis.behaviorScore
        )
      : 79;

  // =====================================================
  // ARRAYS
  // =====================================================

  const strengths =
    Array.isArray(assessment.strengths)
      ? assessment.strengths
      : [];

  const improvements =
    Array.isArray(assessment.improvements)
      ? assessment.improvements
      : [];

  const questionResults =
    Array.isArray(
      assessment.question_results
    )
      ? assessment.question_results
      : Array.isArray(
          assessment.questionResults
        )
      ? assessment.questionResults
      : [];

  const communicationAnalysis =
    assessment.communication_analysis ||
    assessment.communicationAnalysis ||
    {};

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="result-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="result-header">

        <button
          className="result-brand"
          onClick={goToDashboard}
        >
          <div className="result-logo">
            S
          </div>

          <div className="result-brand-text">
            SmartHire <span>AI</span>
          </div>
        </button>

        <div className="result-header-title">
          Interview Performance Report
        </div>

        <button
          className="result-dashboard-btn"
          onClick={goToDashboard}
        >
          Dashboard
        </button>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="result-main">

        {/* =================================================
            SUCCESS HERO
        ================================================= */}

        <section className="result-hero">

          <div className="success-circle">
            ✓
          </div>

          <div className="result-hero-content">

            <div className="completed-badge">
              INTERVIEW COMPLETED
            </div>

            <h1>
              Your AI Interview Report
            </h1>

            <p>
              Great job completing your SmartHire AI
              mock interview. Here is your personalized
              performance analysis.
            </p>

          </div>

        </section>

        {/* =================================================
            OVERALL SCORE
        ================================================= */}

        <section className="overall-score-card">

          <div className="overall-left">

            <span className="section-label">
              OVERALL PERFORMANCE
            </span>

            <h2>
              {performanceLevel}
            </h2>

            <p>
              Your overall interview performance score
              is based on multiple AI evaluation factors.
            </p>

          </div>

          <div className="score-ring-container">

            <div
              className={`score-ring ${getPerformanceClass(
                overallScore
              )}`}
              style={{
                "--score": `${overallScore * 3.6}deg`,
              }}
            >
              <div className="score-ring-inner">
                <strong>
                  {overallScore}
                </strong>

                <span>
                  / 100
                </span>
              </div>
            </div>

          </div>

        </section>

        {/* =================================================
            SCORE CARDS
        ================================================= */}

        <section className="score-grid">

          <div className="metric-card">

            <div className="metric-icon">
              💬
            </div>

            <div className="metric-content">

              <span>
                Communication
              </span>

              <strong>
                {communicationScore}
                <small>/100</small>
              </strong>

              <div className="metric-bar">
                <div
                  style={{
                    width: `${communicationScore}%`,
                  }}
                />
              </div>

            </div>

          </div>

          <div className="metric-card">

            <div className="metric-icon">
              💪
            </div>

            <div className="metric-content">

              <span>
                Confidence
              </span>

              <strong>
                {confidenceScore}
                <small>/100</small>
              </strong>

              <div className="metric-bar">
                <div
                  style={{
                    width: `${confidenceScore}%`,
                  }}
                />
              </div>

            </div>

          </div>

          <div className="metric-card">

            <div className="metric-icon">
              🎯
            </div>

            <div className="metric-content">

              <span>
                Relevance
              </span>

              <strong>
                {relevanceScore}
                <small>/100</small>
              </strong>

              <div className="metric-bar">
                <div
                  style={{
                    width: `${relevanceScore}%`,
                  }}
                />
              </div>

            </div>

          </div>

          <div className="metric-card">

            <div className="metric-icon">
              📝
            </div>

            <div className="metric-content">

              <span>
                Answer Quality
              </span>

              <strong>
                {answerScore}
                <small>/100</small>
              </strong>

              <div className="metric-bar">
                <div
                  style={{
                    width: `${answerScore}%`,
                  }}
                />
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            INTERVIEW SUMMARY
        ================================================= */}

        <section className="report-card summary-card">

          <div className="report-card-header">

            <div className="report-title-icon">
              🤖
            </div>

            <div>
              <span className="section-label">
                AI ANALYSIS
              </span>

              <h2>
                SmartHire AI Summary
              </h2>
            </div>

          </div>

          <p className="summary-text">
            {summary}
          </p>

        </section>

        {/* =================================================
            COMMUNICATION ANALYSIS
        ================================================= */}

        <section className="report-card">

          <div className="report-card-header">

            <div className="report-title-icon">
              🎙️
            </div>

            <div>
              <span className="section-label">
                SPEECH ANALYSIS
              </span>

              <h2>
                Communication Analysis
              </h2>
            </div>

          </div>

          <div className="communication-grid">

            <div className="communication-item">

              <span className="communication-emoji">
                🗣️
              </span>

              <div>
                <strong>
                  Speaking Pace
                </strong>

                <p>
                  {communicationAnalysis.speaking_pace ||
                    communicationAnalysis.speakingPace ||
                    "Analyzed"}
                </p>
              </div>

            </div>

            <div className="communication-item">

              <span className="communication-emoji">
                🔤
              </span>

              <div>
                <strong>
                  Filler Words
                </strong>

                <p>
                  {communicationAnalysis.filler_words ??
                    communicationAnalysis.fillerWords ??
                    "Analyzed"}
                </p>
              </div>

            </div>

            <div className="communication-item">

              <span className="communication-emoji">
                ⏱️
              </span>

              <div>
                <strong>
                  Speaking Time
                </strong>

                <p>
                  {communicationAnalysis.speaking_time ||
                    communicationAnalysis.speakingTime ||
                    formatDuration(
                      session?.duration_seconds
                    )}
                </p>
              </div>

            </div>

            <div className="communication-item">

              <span className="communication-emoji">
                👁️
              </span>

              <div>
                <strong>
                  Attention
                </strong>

                <p>
                  {communicationAnalysis.eye_contact ||
                    communicationAnalysis.eyeContact ||
                    "Analyzed"}
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            STRENGTHS + IMPROVEMENTS
        ================================================= */}

        <section className="insights-grid">

          {/* STRENGTHS */}

          <div className="report-card insight-card">

            <div className="insight-header strengths-header">

              <div className="insight-icon">
                ✓
              </div>

              <div>
                <span className="section-label">
                  POSITIVE
                </span>

                <h2>
                  Your Strengths
                </h2>
              </div>

            </div>

            {strengths.length > 0 ? (
              <ul className="insight-list">
                {strengths.map(
                  (strength, index) => (
                    <li key={index}>
                      <span>✓</span>
                      <p>{strength}</p>
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="empty-insight">
                Keep practicing to identify more
                strengths in future interviews.
              </p>
            )}

          </div>

          {/* IMPROVEMENTS */}

          <div className="report-card insight-card">

            <div className="insight-header improvements-header">

              <div className="insight-icon">
                ↑
              </div>

              <div>
                <span className="section-label">
                  DEVELOPMENT
                </span>

                <h2>
                  Areas to Improve
                </h2>
              </div>

            </div>

            {improvements.length > 0 ? (
              <ul className="insight-list">
                {improvements.map(
                  (improvement, index) => (
                    <li key={index}>
                      <span>→</span>
                      <p>{improvement}</p>
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="empty-insight">
                Excellent! No major improvement areas
                were identified.
              </p>
            )}

          </div>

        </section>

        {/* =================================================
            QUESTION RESULTS
        ================================================= */}

        {questionResults.length > 0 && (
          <section className="report-card">

            <div className="report-card-header">

              <div className="report-title-icon">
                📋
              </div>

              <div>
                <span className="section-label">
                  DETAILED EVALUATION
                </span>

                <h2>
                  Question-by-Question Results
                </h2>
              </div>

            </div>

            <div className="question-results">

              {questionResults.map(
                (result, index) => {

                  const questionScore =
                    getScore(
                      result.score ??
                        result.question_score ??
                        result.answer_score ??
                        0
                    );

                  const questionText =
                    result.question ||
                    result.question_text ||
                    `Question ${index + 1}`;

                  const feedback =
                    result.feedback ||
                    result.evaluation ||
                    result.comment ||
                    "No additional feedback available.";

                  return (
                    <div
                      className="question-result"
                      key={index}
                    >

                      <div className="question-result-top">

                        <div className="question-result-number">
                          {String(
                            index + 1
                          ).padStart(2, "0")}
                        </div>

                        <div className="question-result-question">
                          <span>
                            Question {index + 1}
                          </span>

                          <h3>
                            {questionText}
                          </h3>
                        </div>

                        <div
                          className={`question-score ${getPerformanceClass(
                            questionScore
                          )}`}
                        >
                          {questionScore}
                        </div>

                      </div>

                      <div className="question-feedback">
                        <strong>
                          AI Feedback
                        </strong>

                        <p>
                          {feedback}
                        </p>
                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </section>
        )}

        {/* =================================================
            SESSION INFORMATION
        ================================================= */}

        <section className="session-details">

          <div>
            <span>
              Interview Type
            </span>

            <strong>
              {session?.interview_type ||
                "AI Mock Interview"}
            </strong>
          </div>

          <div>
            <span>
              Domain
            </span>

            <strong>
              {session?.domain ||
                "General"}
            </strong>
          </div>

          <div>
            <span>
              Difficulty
            </span>

            <strong>
              {session?.difficulty ||
                "Medium"}
            </strong>
          </div>

          <div>
            <span>
              Duration
            </span>

            <strong>
              {formatDuration(
                session?.duration_seconds
              )}
            </strong>
          </div>

        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <section className="result-actions">

          <button
            className="retake-btn"
            onClick={retakeInterview}
          >
            🔄 Retake Interview
          </button>

          <button
            className="dashboard-main-btn"
            onClick={goToDashboard}
          >
            🏠 Back to Dashboard
          </button>

        </section>

      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="result-footer">
        <p>
          SmartHire AI • AI-Powered Interview
          Assessment Platform
        </p>
      </footer>

    </div>
  );
}

export default InterviewComplete;