import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./InterviewGeneration.css";

function InterviewGeneration() {
  const navigate = useNavigate();

  // =========================================================
  // FORM STATE
  // =========================================================

  const [interviewType, setInterviewType] =
    useState("Technical");

  const [difficulty, setDifficulty] =
    useState("Medium");

  const [domain, setDomain] =
    useState("Full Stack Development");

  const [customDomain, setCustomDomain] =
    useState("");

  const [numberOfQuestions, setNumberOfQuestions] =
    useState(5);

  const [questions, setQuestions] =
    useState([]);

  const [generated, setGenerated] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // =========================================================
  // QUESTION DATABASE
  // =========================================================

  const questionBank = {

    Technical: {

      "Full Stack Development": [
        "What is the difference between frontend and backend development?",
        "Explain the role of REST APIs in a full stack application.",
        "What is the difference between SQL and NoSQL databases?",
        "How does authentication work in a web application?",
        "Explain the difference between HTTP and HTTPS.",
        "What is middleware and why is it used in backend development?",
        "Explain the concept of responsive web design.",
        "What is the purpose of Git and GitHub in software development?",
        "Explain client-side rendering and server-side rendering.",
        "How would you design a scalable web application?"
      ],

      Python: [
        "What are the main features of Python?",
        "Explain the difference between a list, tuple and set in Python.",
        "What is a dictionary in Python?",
        "What are functions in Python?",
        "Explain object-oriented programming in Python.",
        "What is exception handling in Python?",
        "What is the difference between == and is in Python?",
        "Explain Python modules and packages.",
        "What are decorators in Python?",
        "How does memory management work in Python?"
      ],

      "Data Science": [
        "What is data science and where is it used?",
        "Explain the difference between supervised and unsupervised learning.",
        "What is data preprocessing?",
        "What is feature engineering?",
        "Explain classification and regression.",
        "What is overfitting?",
        "What is cross-validation?",
        "Explain precision, recall and F1-score.",
        "What is clustering?",
        "How would you handle missing values in a dataset?"
      ],

      "Artificial Intelligence": [
        "What is Artificial Intelligence?",
        "Explain the difference between AI, ML and Deep Learning.",
        "What is supervised learning?",
        "What is unsupervised learning?",
        "What is a neural network?",
        "What is a CNN and where is it used?",
        "Explain overfitting and underfitting.",
        "What is a training dataset?",
        "What is model evaluation?",
        "How can AI be used in recruitment?"
      ],

      "Machine Learning": [
        "What is Machine Learning?",
        "Explain supervised and unsupervised learning.",
        "What is linear regression?",
        "What is logistic regression?",
        "What is a decision tree?",
        "What is random forest?",
        "What is overfitting?",
        "What is feature scaling?",
        "Explain confusion matrix.",
        "How do you evaluate a machine learning model?"
      ],

      Database: [
        "What is a database?",
        "What is the difference between SQL and NoSQL?",
        "What is a primary key?",
        "What is a foreign key?",
        "Explain database normalization.",
        "What are SQL joins?",
        "What is an index?",
        "What is a transaction?",
        "Explain ACID properties.",
        "How would you optimize a slow database query?"
      ]
    },

    HR: [

      "Tell me about yourself.",
      "Why do you want to join our company?",
      "What are your strengths?",
      "What is one weakness you are working on?",
      "Where do you see yourself in five years?",
      "Why should we hire you?",
      "Tell me about a challenging situation you faced.",
      "How do you handle pressure?",
      "How do you handle criticism?",
      "Tell me about a time when you worked in a team.",
      "What motivates you?",
      "How do you prioritize your work?",
      "Describe your ideal workplace.",
      "How do you deal with failure?",
      "Why did you choose your career?"
    ],

    Behavioral: [

      "Tell me about a time when you solved a difficult problem.",
      "Describe a situation where you had to work with a difficult teammate.",
      "Tell me about a time when you demonstrated leadership.",
      "Describe a time when you made a mistake and learned from it.",
      "Tell me about a time when you had to meet a tight deadline.",
      "Describe a situation where you had to adapt to change.",
      "Tell me about a time when you helped someone.",
      "Describe a situation where you had multiple responsibilities.",
      "Tell me about a time you received negative feedback.",
      "Describe a time when you showed initiative.",
      "Tell me about a difficult decision you made.",
      "Describe a time when communication helped solve a problem.",
      "Tell me about a project you are proud of.",
      "Describe a situation where you disagreed with someone.",
      "Tell me about something you learned from failure."
    ],

    Aptitude: [

      "If a number is increased by 20% and then decreased by 20%, what is the overall percentage change?",
      "A train travels 120 km in 2 hours. What is its average speed?",
      "If 5 workers complete a task in 12 days, how many days would 10 workers take?",
      "Find the next number in the sequence: 2, 6, 12, 20, 30, ?",
      "A product costs ₹800 and is sold for ₹960. What is the profit percentage?",
      "If the ratio of boys to girls is 3:2 and there are 30 boys, how many girls are there?",
      "A person walks 5 km north and then 3 km east. What is the shortest distance from the starting point?",
      "What is the probability of getting a head when a fair coin is tossed?",
      "If 3x + 7 = 22, find x.",
      "A shop gives a 10% discount on an item priced at ₹2000. What is the selling price?",
      "What is the average of 10, 20, 30, 40 and 50?",
      "If a car travels at 60 km/h, how far will it travel in 45 minutes?",
      "A number is divisible by both 3 and 5. What can you say about the number?",
      "If 25% of a number is 50, what is the number?",
      "Find the simple interest on ₹5000 at 10% per year for 2 years."
    ]
  };

  // =========================================================
  // DIFFICULTY MODIFIER
  // =========================================================

  const difficultyQuestions = {

    Easy: [
      "Explain the basic concept of",
      "What do you understand by",
      "What is the purpose of",
      "Give a simple explanation of"
    ],

    Medium: [
      "Explain with an example",
      "How would you practically use",
      "Compare and explain",
      "Describe how you would implement"
    ],

    Hard: [
      "How would you design and optimize",
      "Analyze the challenges involved in",
      "How would you solve a complex problem involving",
      "Explain an advanced real-world application of"
    ]
  };

  // =========================================================
  // GET QUESTIONS
  // =========================================================

  const getQuestionList = () => {

    if (interviewType === "HR") {
      return questionBank.HR;
    }

    if (interviewType === "Behavioral") {
      return questionBank.Behavioral;
    }

    if (interviewType === "Aptitude") {
      return questionBank.Aptitude;
    }

    const selectedDomain =
      customDomain.trim() ||
      domain;

    const matchingDomain =
      Object.keys(questionBank.Technical).find(
        (item) =>
          item.toLowerCase() ===
          selectedDomain.toLowerCase()
      );

    if (matchingDomain) {
      return questionBank.Technical[
        matchingDomain
      ];
    }

    return questionBank.Technical[
      "Full Stack Development"
    ];
  };

  // =========================================================
  // SHUFFLE
  // =========================================================

  const shuffleQuestions = (array) => {

    const shuffled = [...array];

    for (
      let i = shuffled.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        shuffled[i],
        shuffled[j]
      ] = [
        shuffled[j],
        shuffled[i]
      ];
    }

    return shuffled;
  };

  // =========================================================
  // GENERATE INTERVIEW
  // =========================================================

  const generateInterview = () => {

    setLoading(true);
    setGenerated(false);

    setTimeout(() => {

      let availableQuestions =
        getQuestionList();

      availableQuestions =
        shuffleQuestions(
          availableQuestions
        );

      let selectedQuestions =
        availableQuestions.slice(
          0,
          numberOfQuestions
        );

      /*
        If user selects more questions than
        the current question bank contains,
        repeat shuffled questions to reach
        the requested number.
      */

      while (
        selectedQuestions.length <
        numberOfQuestions
      ) {

        const extra =
          shuffleQuestions(
            availableQuestions
          );

        selectedQuestions = [
          ...selectedQuestions,
          ...extra
        ];
      }

      selectedQuestions =
        selectedQuestions.slice(
          0,
          numberOfQuestions
        );

      setQuestions(
        selectedQuestions
      );

      // =====================================================
      // SAVE FOR MOCK INTERVIEW
      // =====================================================

      localStorage.setItem(
        "smarthire_generated_questions",
        JSON.stringify(
          selectedQuestions
        )
      );

      localStorage.setItem(
        "smarthire_interview_info",
        JSON.stringify({
          type: interviewType,
          difficulty: difficulty,
          domain:
            customDomain.trim() ||
            domain,
          numberOfQuestions:
            numberOfQuestions
        })
      );

      setGenerated(true);
      setLoading(false);

    }, 900);
  };

  // =========================================================
  // START MOCK INTERVIEW
  // =========================================================

  const startMockInterview = () => {

    if (!questions.length) {
      alert(
        "Please generate an interview first."
      );
      return;
    }

    navigate(
      "/candidate/mock-interview"
    );
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetInterview = () => {

    setQuestions([]);
    setGenerated(false);
    setCustomDomain("");
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="interview-generation-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="ig-header">

        <button
          className="ig-brand"
          onClick={() =>
            navigate("/candidate")
          }
        >

          <div className="ig-logo">
            S
          </div>

          <div>
            SmartHire <span>AI</span>
          </div>

        </button>

        <button
          className="ig-dashboard-btn"
          onClick={() =>
            navigate("/candidate")
          }
        >
          ← Candidate Dashboard
        </button>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="ig-main">

        {/* TITLE */}

        <section className="ig-heading">

          <div className="ig-small-title">
            AI POWERED INTERVIEW
          </div>

          <h1>
            Generate Your
            <span> AI Interview</span>
          </h1>

          <p>
            Create a personalized mock interview
            based on your role, domain and
            difficulty level.
          </p>

        </section>

        {/* ===================================================
            GENERATOR CARD
        =================================================== */}

        <section className="generator-card">

          <div className="card-heading">

            <div className="card-icon">
              ✨
            </div>

            <div>
              <h2>
                Interview Configuration
              </h2>

              <p>
                Customize your AI-generated
                interview
              </p>
            </div>

          </div>

          {/* INTERVIEW TYPE */}

          <div className="form-section">

            <label>
              Interview Type
            </label>

            <div className="option-grid">

              {[
                {
                  name: "Technical",
                  icon: "💻",
                  description:
                    "Technical skills"
                },
                {
                  name: "HR",
                  icon: "👥",
                  description:
                    "HR & personality"
                },
                {
                  name: "Behavioral",
                  icon: "🧠",
                  description:
                    "Situational skills"
                },
                {
                  name: "Aptitude",
                  icon: "📊",
                  description:
                    "Logical ability"
                }
              ].map((item) => (

                <button
                  key={item.name}
                  className={`type-option ${
                    interviewType ===
                    item.name
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setInterviewType(
                      item.name
                    );
                    setGenerated(false);
                  }}
                >

                  <div className="type-icon">
                    {item.icon}
                  </div>

                  <div className="type-text">

                    <strong>
                      {item.name}
                    </strong>

                    <small>
                      {item.description}
                    </small>

                  </div>

                  {interviewType ===
                    item.name && (
                    <div className="selected-check">
                      ✓
                    </div>
                  )}

                </button>

              ))}

            </div>

          </div>

          {/* DOMAIN */}

          {interviewType ===
            "Technical" && (

            <div className="form-section">

              <label>
                Technology / Domain
              </label>

              <select
                value={domain}
                onChange={(e) => {
                  setDomain(
                    e.target.value
                  );
                  setGenerated(false);
                }}
                className="ig-select"
              >

                <option>
                  Full Stack Development
                </option>

                <option>
                  Python
                </option>

                <option>
                  Data Science
                </option>

                <option>
                  Artificial Intelligence
                </option>

                <option>
                  Machine Learning
                </option>

                <option>
                  Database
                </option>

              </select>

              <input
                type="text"
                className="custom-domain-input"
                placeholder="Or enter your own domain..."
                value={customDomain}
                onChange={(e) => {
                  setCustomDomain(
                    e.target.value
                  );
                  setGenerated(false);
                }}
              />

            </div>

          )}

          {/* DIFFICULTY */}

          <div className="form-section">

            <label>
              Difficulty Level
            </label>

            <div className="difficulty-grid">

              {[
                "Easy",
                "Medium",
                "Hard"
              ].map((level) => (

                <button
                  key={level}
                  className={`difficulty-option ${
                    difficulty === level
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setDifficulty(level);
                    setGenerated(false);
                  }}
                >

                  <span>
                    {level === "Easy"
                      ? "🌱"
                      : level === "Medium"
                      ? "⚡"
                      : "🔥"}
                  </span>

                  <strong>
                    {level}
                  </strong>

                  {difficulty ===
                    level && (
                    <small>
                      ✓ Selected
                    </small>
                  )}

                </button>

              ))}

            </div>

          </div>

          {/* NUMBER OF QUESTIONS */}

          <div className="form-section">

            <label>
              Number of Questions
            </label>

            <div className="number-buttons">

              {[5, 10, 15].map(
                (number) => (

                  <button
                    key={number}
                    className={
                      numberOfQuestions ===
                      number
                        ? "number-option active"
                        : "number-option"
                    }
                    onClick={() => {
                      setNumberOfQuestions(
                        number
                      );
                      setGenerated(false);
                    }}
                  >
                    {number}
                  </button>

                )
              )}

            </div>

          </div>

          {/* GENERATE */}

          <button
            className="generate-btn"
            onClick={generateInterview}
            disabled={loading}
          >

            {loading ? (
              <>
                <span className="loading-spinner">
                  ◌
                </span>

                Generating Interview...
              </>
            ) : (
              <>
                ✨ Generate AI Interview
                <span>→</span>
              </>
            )}

          </button>

        </section>

        {/* ===================================================
            GENERATED QUESTIONS
        =================================================== */}

        {generated &&
          questions.length > 0 && (

          <section className="generated-section">

            <div className="generated-header">

              <div>

                <div className="ig-small-title">
                  AI GENERATED
                </div>

                <h2>
                  Your Interview Questions
                </h2>

                <p>
                  {questions.length} questions
                  personalized for your interview.
                </p>

              </div>

              <div className="generated-count">
                {questions.length}
                <small>
                  Questions
                </small>
              </div>

            </div>

            <div className="question-list">

              {questions.map(
                (question, index) => (

                  <div
                    className="question-card"
                    key={index}
                  >

                    <div className="question-number">
                      {String(
                        index + 1
                      ).padStart(2, "0")}
                    </div>

                    <div className="question-content">

                      <div className="question-meta">

                        <span>
                          {interviewType}
                        </span>

                        <span>
                          {difficulty}
                        </span>

                      </div>

                      <h3>
                        {question}
                      </h3>

                    </div>

                  </div>

                )
              )}

            </div>

            {/* ACTIONS */}

            <div className="generated-actions">

              <button
                className="regenerate-btn"
                onClick={generateInterview}
              >
                ↻ Regenerate
              </button>

              <button
                className="start-mock-btn"
                onClick={
                  startMockInterview
                }
              >
                🎤 Start Mock Interview
                <span>→</span>
              </button>

            </div>

          </section>

        )}

        {/* ===================================================
            INFO
        =================================================== */}

        {!generated && (

          <section className="ig-info">

            <div className="info-item">

              <div>
                🎯
              </div>

              <span>
                Personalized
              </span>

              <small>
                Questions match your selected
                domain and difficulty.
              </small>

            </div>

            <div className="info-item">

              <div>
                🤖
              </div>

              <span>
                AI Powered
              </span>

              <small>
                Intelligent interview experience
                designed for practice.
              </small>

            </div>

            <div className="info-item">

              <div>
                📈
              </div>

              <span>
                Performance
              </span>

              <small>
                Complete the interview to receive
                your assessment.
              </small>

            </div>

          </section>

        )}

      </main>

    </div>
  );
}

export default InterviewGeneration;