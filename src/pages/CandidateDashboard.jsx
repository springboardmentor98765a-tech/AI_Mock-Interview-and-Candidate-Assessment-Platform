import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function CandidateDashboard() {
  const navigate = useNavigate();

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [assessment, setAssessment] = useState(null);

  // =====================================================
  // LOAD ASSESSMENT
  // =====================================================

  useEffect(() => {
    loadAssessment();
  }, []);

  const loadAssessment = () => {
    try {
      const savedAssessment = localStorage.getItem(
        "smarthire_interview_assessment"
      );

      if (savedAssessment) {
        const parsed = JSON.parse(savedAssessment);
        setAssessment(parsed);
      }
    } catch (error) {
      console.error("Unable to load assessment:", error);
    }
  };

  // =====================================================
  // GET REAL VALUE OR DEMO FALLBACK
  // =====================================================

  const getScore = (names, fallback) => {
    if (!assessment) {
      return fallback;
    }

    for (const name of names) {
      const value = assessment[name];

      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !Number.isNaN(Number(value)) &&
        Number(value) > 0
      ) {
        return Math.round(
          Math.max(0, Math.min(100, Number(value)))
        );
      }
    }

    return fallback;
  };

  // =====================================================
  // ANALYTICS
  // =====================================================

  const analytics = useMemo(() => {
    return {
      overall: getScore(
        [
          "overall_score",
          "overallScore",
          "score",
        ],
        78
      ),

      technical: getScore(
        [
          "technical_score",
          "technicalScore",
          "answer_score",
          "answerScore",
          "answer_quality_score",
        ],
        85
      ),

      communication: getScore(
        [
          "communication_score",
          "communicationScore",
          "communication",
        ],
        82
      ),

      confidence: getScore(
        [
          "confidence_score",
          "confidenceScore",
          "confidence",
        ],
        76
      ),

      relevance: getScore(
        [
          "relevance_score",
          "relevanceScore",
          "relevance",
        ],
        74
      ),

      eyeContact: getScore(
        [
          "eye_contact_percent",
          "eyeContact",
          "eye_contact",
        ],
        80
      ),

      attention: getScore(
        [
          "attention_percent",
          "attention",
        ],
        84
      ),

      engagement: getScore(
        [
          "engagement_percent",
          "engagement",
        ],
        81
      ),

      behavior: getScore(
        [
          "behavior_score",
          "behaviorScore",
        ],
        79
      ),
    };
  }, [assessment]);

  // =====================================================
  // PERFORMANCE LEVEL
  // =====================================================

  const performanceLevel =
    analytics.overall >= 85
      ? "Excellent"
      : analytics.overall >= 70
      ? "Good"
      : analytics.overall >= 50
      ? "Average"
      : "Needs Improvement";

  // =====================================================
  // AI SUMMARY
  // =====================================================

  const aiSummary =
    assessment?.summary ||
    assessment?.ai_summary ||
    assessment?.aiSummary ||
    `You completed a mock interview with an overall score of ${analytics.overall}/100. Your communication score was ${analytics.communication}/100 and confidence was ${analytics.confidence}/100. You demonstrated good interview potential and should continue practicing structured answers and providing specific examples.`;

  // =====================================================
  // START MOCK INTERVIEW
  // =====================================================

  const startMockInterview = () => {
    navigate("/candidate/interview-generation");
  };

  // =====================================================
  // DOWNLOAD REPORT
  // =====================================================

  const downloadReport = () => {
    const report = `
====================================================
                 SMARTHIRE AI
             INTERVIEW PERFORMANCE REPORT
====================================================

Overall Score      : ${analytics.overall}/100
Performance Level  : ${performanceLevel}

----------------------------------------------------
PERFORMANCE METRICS
----------------------------------------------------

Technical Skills   : ${analytics.technical}/100
Communication      : ${analytics.communication}/100
Confidence         : ${analytics.confidence}/100
Relevance          : ${analytics.relevance}/100

----------------------------------------------------
VISUAL ANALYSIS
----------------------------------------------------

Eye Contact        : ${analytics.eyeContact}%
Attention          : ${analytics.attention}%
Engagement         : ${analytics.engagement}%
Behavior Score     : ${analytics.behavior}/100

----------------------------------------------------
AI SUMMARY
----------------------------------------------------

${aiSummary}

----------------------------------------------------

Generated by SmartHire AI
====================================================
`;

    const blob = new Blob([report], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "SmartHire_AI_Interview_Report.txt";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-page candidate-dashboard">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="dashboard-header">

        <div className="dashboard-logo">
          <div>S</div>
          SmartHire <span>AI</span>
        </div>

        <div className="dashboard-user">

          <div className="user-avatar">
            C
          </div>

          <div>
            <strong>Candidate</strong>
            <small>Candidate Account</small>
          </div>

          <button onClick={() => navigate("/")}>
            Logout
          </button>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="dashboard-main">

        {/* WELCOME */}

        <div className="welcome-section">

          <div>

            <span className="dashboard-badge">
              🎓 Candidate Portal
            </span>

            <h1>
              Welcome back, Candidate!
            </h1>

            <p>
              Continue your interview preparation and track your progress.
            </p>

          </div>

          <button
            className="dashboard-primary"
            onClick={startMockInterview}
          >
            🎤 Start Mock Interview
          </button>

        </div>

        {/* =================================================
            STATS
        ================================================= */}

        <div className="dashboard-stats">

          <div>
            <span>📄</span>
            <small>Resumes</small>
            <strong>3</strong>
          </div>

          <div>
            <span>🎤</span>
            <small>Interviews</small>
            <strong>12</strong>
          </div>

          <div>
            <span>⭐</span>
            <small>Average Score</small>
            <strong>
              {analytics.overall}%
            </strong>
          </div>

          <div>
            <span>📈</span>
            <small>Improvement</small>
            <strong>
              +18%
            </strong>
          </div>

        </div>

        {/* =================================================
            DASHBOARD GRID
        ================================================= */}

        <div className="dashboard-grid">

          {/* PERFORMANCE */}

          <div className="large-dashboard-card">

            <div className="card-heading">

              <div>
                <h3>
                  Performance Overview
                </h3>

                <p>
                  Your recent interview performance
                </p>
              </div>

              <span>
                Last 30 days
              </span>

            </div>

            <div className="performance-bars">

              <div>
                <label>
                  Technical Skills
                </label>

                <div>
                  <i
                    style={{
                      width: `${analytics.technical}%`,
                    }}
                  />
                </div>

                <b>
                  {analytics.technical}%
                </b>
              </div>

              <div>
                <label>
                  Communication
                </label>

                <div>
                  <i
                    style={{
                      width: `${analytics.communication}%`,
                    }}
                  />
                </div>

                <b>
                  {analytics.communication}%
                </b>
              </div>

              <div>
                <label>
                  Confidence
                </label>

                <div>
                  <i
                    style={{
                      width: `${analytics.confidence}%`,
                    }}
                  />
                </div>

                <b>
                  {analytics.confidence}%
                </b>
              </div>

              <div>
                <label>
                  Problem Solving
                </label>

                <div>
                  <i
                    style={{
                      width: "91%",
                    }}
                  />
                </div>

                <b>
                  91%
                </b>
              </div>

            </div>

          </div>

          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <div className="dashboard-card">

            <h3>
              Quick Actions
            </h3>

            <button
              onClick={() =>
                navigate("/candidate/resume")
              }
            >
              📄 Upload Resume
            </button>

            <button
              onClick={() =>
                navigate("/candidate/interview-generation")
              }
            >
              ✨ AI Interview Generator
            </button>

            <button
              onClick={startMockInterview}
            >
              🎤 Mock Interview
            </button>

            <button
              onClick={() => {
                loadAssessment();
                setShowAnalytics(true);
              }}
            >
              📊 View Analytics
            </button>

            <button
              onClick={downloadReport}
            >
              📥 Download Report
            </button>

          </div>

        </div>

      </main>

      {/* =====================================================
          ANALYTICS POPUP
      ===================================================== */}

      {showAnalytics && (

        <div
          onClick={() => setShowAnalytics(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(55, 35, 65, 0.35)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >

          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "24px",
              padding: "32px",
              boxShadow:
                "0 25px 70px rgba(60, 35, 75, 0.3)",
            }}
          >

            {/* =================================================
                ANALYTICS HEADER
            ================================================= */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "25px",
              }}
            >

              <div>

                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "#a45bbd",
                    letterSpacing: "1px",
                  }}
                >
                  SMART PERFORMANCE
                </span>

                <h2
                  style={{
                    margin: "5px 0",
                    color: "#3f294a",
                  }}
                >
                  📊 Interview Analytics
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#765f80",
                  }}
                >
                  Your latest AI-powered performance analysis
                </p>

              </div>

              <button
                onClick={() =>
                  setShowAnalytics(false)
                }
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "none",
                  background: "#f5e8f8",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                ✕
              </button>

            </div>

            {/* =================================================
                OVERALL SCORE
            ================================================= */}

            <div
              style={{
                padding: "28px",
                borderRadius: "20px",
                background:
                  "linear-gradient(135deg, #fce8f6, #eee8ff)",
                textAlign: "center",
                marginBottom: "22px",
              }}
            >

              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  letterSpacing: "1px",
                  color: "#a052b8",
                }}
              >
                OVERALL PERFORMANCE
              </span>

              <div
                style={{
                  fontSize: "58px",
                  fontWeight: "900",
                  color: "#62466e",
                  lineHeight: 1.1,
                  marginTop: "8px",
                }}
              >
                {analytics.overall}%
              </div>

              <strong
                style={{
                  color: "#a04bc1",
                  fontSize: "17px",
                }}
              >
                {performanceLevel}
              </strong>

            </div>

            {/* =================================================
                METRICS
            ================================================= */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
              }}
            >

              {[
                [
                  "💻",
                  "Technical",
                  analytics.technical,
                ],
                [
                  "💬",
                  "Communication",
                  analytics.communication,
                ],
                [
                  "💪",
                  "Confidence",
                  analytics.confidence,
                ],
                [
                  "🎯",
                  "Relevance",
                  analytics.relevance,
                ],
                [
                  "👁️",
                  "Eye Contact",
                  analytics.eyeContact,
                ],
                [
                  "🧠",
                  "Attention",
                  analytics.attention,
                ],
                [
                  "✨",
                  "Engagement",
                  analytics.engagement,
                ],
                [
                  "📈",
                  "Behavior",
                  analytics.behavior,
                ],
              ].map(
                ([icon, title, value]) => (

                  <div
                    key={title}
                    style={{
                      padding: "18px",
                      borderRadius: "16px",
                      background: "#fcf9fd",
                      border:
                        "1px solid #eadff0",
                    }}
                  >

                    <div
                      style={{
                        color: "#523b5e",
                        fontSize: "15px",
                      }}
                    >
                      {icon} {title}
                    </div>

                    <strong
                      style={{
                        display: "block",
                        fontSize: "27px",
                        marginTop: "8px",
                        color: "#654a70",
                      }}
                    >
                      {value}%
                    </strong>

                    <div
                      style={{
                        height: "7px",
                        marginTop: "8px",
                        background: "#eadfea",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >

                      <div
                        style={{
                          width: `${value}%`,
                          height: "100%",
                          borderRadius: "10px",
                          background:
                            "linear-gradient(90deg, #ed82b8, #b875e5)",
                        }}
                      />

                    </div>

                  </div>

                )
              )}

            </div>

            {/* =================================================
                AI SUMMARY
            ================================================= */}

            <div
              style={{
                marginTop: "25px",
                padding: "20px",
                borderRadius: "16px",
                background: "#faf6fc",
              }}
            >

              <h3
                style={{
                  marginTop: 0,
                  color: "#3f294a",
                }}
              >
                🤖 AI Summary
              </h3>

              <p
                style={{
                  lineHeight: 1.7,
                  color: "#5d4967",
                  marginBottom: 0,
                }}
              >
                {aiSummary}
              </p>

            </div>

            {/* =================================================
                BUTTONS
            ================================================= */}

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "25px",
              }}
            >

              <button
                onClick={downloadReport}
                style={{
                  padding: "13px 22px",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  color: "#5e426b",
                  background:
                    "linear-gradient(135deg, #f5d5eb, #ddd1fa)",
                }}
              >
                📥 Download Report
              </button>

              <button
                onClick={() =>
                  navigate("/candidate/interview-complete")
                }
                style={{
                  padding: "13px 22px",
                  border: "1px solid #ddcde6",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  color: "#654a70",
                  background: "#ffffff",
                }}
              >
                🎤 View Interview Result
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default CandidateDashboard;
