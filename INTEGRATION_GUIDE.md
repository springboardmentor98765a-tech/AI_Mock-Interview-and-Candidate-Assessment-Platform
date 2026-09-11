# Scoring System Integration Guide

## Quick Integration Steps

This guide shows exactly how to integrate the scoring system into your existing interview components.

---

## Step 1: Import Required Modules

In your interview completion component (e.g., `WebcamRecorder.jsx`, `CandidateDashboard.jsx`):

```javascript
// Import the scoring integration handler
import { 
  handleInterviewCompletion, 
  handleAnswerSubmission 
} from '../integrations/interviewSubmissionHandler';

// Or use the custom hook
import useScoring from '../hooks/useScoring';

// Import result display component
import InterviewResults from '../components/InterviewResults';

// Import utilities
import { transformReportData } from '../utils/scoringUtils';
```

---

## Step 2A: Using the Handler Function (Recommended for existing code)

### In your interview completion handler:

```javascript
// When user clicks "Submit Interview" or interview completes
const handleInterviewComplete = async () => {
  setLoading(true);

  try {
    // Prepare your Q&A data
    const qaPairs = [
      {
        question: "What is Machine Learning?",
        answer: "Machine Learning is...", // The candidate's answer
        expected_answer: "ML is a subset of AI..." // Optional
      },
      // ... more Q&A pairs
    ];

    // Get interview metadata
    const interviewId = getCurrentInterviewId(); // Your ID
    const domain = 'ai_ml'; // 'ai_ml', 'sde', or 'hr'
    const interviewType = 'tr'; // 'tr' (technical), 'mr' (managerial), 'hr'

    // Optional: Behavioral data from video analysis
    const behavioralData = {
      eyeContactPercentage: 75, // 0-100
      engagementScore: 0.82,    // 0-1
      attentionScore: 0.88      // 0-1
    };

    // Call the scoring handler
    const result = await handleInterviewCompletion(
      interviewId,
      qaPairs,
      domain,
      interviewType,
      behavioralData
    );

    if (result.success) {
      // Show results
      setReportData(result.reportData);
      setShowResults(true);
    } else {
      setError(result.error);
    }
  } catch (err) {
    console.error('Interview submission error:', err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Step 2B: Using the useScoring Hook (Cleaner approach)

### In your functional component:

```javascript
import useScoring from '../hooks/useScoring';
import InterviewResults from '../components/InterviewResults';

function CandidateInterview() {
  const interviewId = 'current-interview-id';
  const [qaPairs, setQAPairs] = useState([]);
  const [domain, setDomain] = useState('ai_ml');
  const [interviewType, setInterviewType] = useState('tr');

  // Initialize the scoring hook
  const { 
    scoreSession, 
    reportData, 
    loading, 
    error 
  } = useScoring(interviewId);

  // Call this when interview is complete
  const handleComplete = async () => {
    try {
      await scoreSession(
        qaPairs,           // Array of Q&A objects
        domain,            // Interview domain
        interviewType,     // Interview type
        behavioralData     // Optional
      );
      // reportData will be automatically set
    } catch (err) {
      console.error('Scoring error:', err);
    }
  };

  // Show results once scoring is complete
  if (reportData) {
    return (
      <InterviewResults
        interviewId={interviewId}
        onRetake={handleRetakeInterview}
        onNavigate={handleNavigation}
      />
    );
  }

  return (
    <div>
      {/* Your interview UI */}
      <button onClick={handleComplete} disabled={loading}>
        {loading ? 'Analyzing Your Performance...' : 'Submit Interview'}
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
```

---

## Step 3: Display Results

### Option A: Use the InterviewResults component (recommended)

```javascript
import InterviewResults from '../components/InterviewResults';

function InterviewPage() {
  const [showResults, setShowResults] = useState(false);
  const interviewId = 'interview-123';

  if (showResults) {
    return (
      <InterviewResults
        interviewId={interviewId}
        onRetake={() => {
          // Reset interview state
          setShowResults(false);
          // Start new interview
        }}
        onNavigate={(page) => {
          if (page === 'dashboard') {
            // Navigate to dashboard
            navigate('/dashboard');
          }
        }}
        showHistory={true} // Show score history tab
      />
    );
  }

  return <ConductInterview />;
}
```

### Option B: Manual display with PerformanceReport

```javascript
import PerformanceReport from '../components/PerformanceReport';
import { scoringAPI } from '../services/scoringAPI';
import { transformReportData } from '../utils/scoringUtils';

function ResultsPage() {
  const [reportData, setReportData] = useState(null);
  const interviewId = useParams().interviewId;

  useEffect(() => {
    const loadReport = async () => {
      const response = await scoringAPI.getPerformanceReport(interviewId);
      const transformed = transformReportData(response);
      setReportData(transformed);
    };
    loadReport();
  }, [interviewId]);

  return (
    <div>
      {reportData && <PerformanceReport reportData={reportData} />}
    </div>
  );
}
```

---

## Step 4: Real-time Answer Scoring (Optional)

### Score each answer as it's submitted:

```javascript
const handleAnswerRecorded = async (answer, question) => {
  const result = await handleAnswerSubmission(
    answer,
    question,
    'ai_ml',  // domain
    ''        // expected answer
  );

  if (result.success) {
    console.log(`Answer score: ${result.score}/100`);
    // Show real-time feedback to candidate
    displayFeedback(result.score);
  }
};
```

---

## Complete Example: Modified WebcamRecorder

Here's a complete example of how to modify an existing WebcamRecorder component:

```javascript
import React, { useState, useRef, useEffect } from 'react';
import { handleInterviewCompletion } from '../integrations/interviewSubmissionHandler';
import InterviewResults from '../components/InterviewResults';
import './WebcamRecorder.css';

function WebcamRecorder() {
  const [recordings, setRecordings] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interviewId, setInterviewId] = useState(null);

  // Initialize interview on mount
  useEffect(() => {
    initializeInterview();
  }, []);

  const initializeInterview = () => {
    // Create new interview ID or get from URL
    const id = generateInterviewId(); // Your function
    setInterviewId(id);
  };

  const handleRecordingComplete = (questionIndex, answer) => {
    setRecordings(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        question: questions[questionIndex], // Your questions array
        answer: answer,
        expectedAnswer: expectedAnswers[questionIndex] // If available
      };
      return updated;
    });
  };

  const handleSubmitInterview = async () => {
    if (!interviewId || recordings.length === 0) {
      setError('Please complete all questions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare Q&A pairs
      const qaPairs = recordings.map(rec => ({
        question: rec.question,
        answer: rec.answer,
        expected_answer: rec.expectedAnswer || ''
      }));

      // Get domain and type (from state, props, or URL)
      const domain = 'ai_ml';    // Replace with actual domain
      const interviewType = 'tr'; // Replace with actual type

      // Optional: Analyze video for behavioral data
      const behavioralData = {
        eyeContactPercentage: analyzeVideo(), // Your analysis
        engagementScore: 0.85,
        attentionScore: 0.90
      };

      // Score the interview
      const result = await handleInterviewCompletion(
        interviewId,
        qaPairs,
        domain,
        interviewType,
        behavioralData
      );

      if (result.success) {
        setShowResults(true);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error submitting interview:', err);
      setError(err.message || 'Failed to submit interview');
    } finally {
      setLoading(false);
    }
  };

  // Show results view
  if (showResults && interviewId) {
    return (
      <InterviewResults
        interviewId={interviewId}
        onRetake={() => {
          setShowResults(false);
          setRecordings([]);
          initializeInterview();
        }}
        onNavigate={(page) => {
          if (page === 'dashboard') {
            window.location.href = '/candidate-dashboard';
          }
        }}
        showHistory={true}
      />
    );
  }

  // Show recording interface
  return (
    <div className="webcam-recorder">
      {/* Your recording UI */}
      
      <div className="recording-list">
        {recordings.map((rec, idx) => (
          <div key={idx} className="recording-item">
            <p className="question">{rec.question}</p>
            <audio controls src={rec.answer} />
          </div>
        ))}
      </div>

      {error && <div className="error-box">{error}</div>}

      <button 
        onClick={handleSubmitInterview} 
        disabled={loading || recordings.length === 0}
        className="submit-btn"
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Analyzing Your Performance...
          </>
        ) : (
          'Submit Interview'
        )}
      </button>
    </div>
  );
}

export default WebcamRecorder;
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Interview Component (WebcamRecorder, etc.)             │
└──────────────┬──────────────────────────────────────────┘
               │
               │ collectQAPairs()
               ▼
┌──────────────────────────────────────────────────────────┐
│  Q&A Pairs Array                                         │
│  [{question, answer, expected_answer}, ...]              │
└──────────────┬──────────────────────────────────────────┘
               │
               │ handleInterviewCompletion() or
               │ scoreSession() hook
               ▼
┌──────────────────────────────────────────────────────────┐
│  scoringAPI.scoreSession()                               │
│  Sends to /api/scoring/session                           │
└──────────────┬──────────────────────────────────────────┘
               │
               │ HTTP POST to backend
               ▼
┌──────────────────────────────────────────────────────────┐
│  Backend Scoring                                         │
│  Routes (scoring.js) → Service → Python ML API           │
└──────────────┬──────────────────────────────────────────┘
               │
               │ Returns scored data
               ▼
┌──────────────────────────────────────────────────────────┐
│  transformReportData() in frontend                       │
│  Formats for PerformanceReport component                 │
└──────────────┬──────────────────────────────────────────┘
               │
               │ setReportData()
               ▼
┌──────────────────────────────────────────────────────────┐
│  InterviewResults Component                              │
│  Displays PerformanceReport + ScoreHistory               │
└──────────────────────────────────────────────────────────┘
```

---

## Key Data Structures

### Q&A Pair Object

```javascript
{
  question: "What is machine learning?",
  answer: "The candidate's spoken/written answer",
  expected_answer: "Optional: the reference answer" // Can be empty
}
```

### Behavioral Data Object (Optional)

```javascript
{
  eyeContactPercentage: 75,     // 0-100
  engagementScore: 0.85,        // 0-1
  attentionScore: 0.90          // 0-1
}
```

### Report Data Structure

```javascript
{
  overallScore: 78.5,
  performanceRating: "Good",
  performanceBreakdown: {
    communication: { score: 80, category: "Good", details: {} },
    confidence: { score: 75, category: "Good", details: {} },
    technicalRelevance: { score: 82, category: "Good", details: {} },
    professionalism: { score: 75, category: "Good", details: {} }
  },
  feedback: {
    strengths: ["Clear explanations", ...],
    weaknesses: ["Too many filler words", ...],
    improvements: ["Practice speaking more clearly", ...],
    recommendations: ["Take a public speaking course", ...],
    practiceAreas: { Communication: { current: 80, target: 90 } },
    learningResources: [{ title: "...", url: "...", type: "video" }]
  },
  keyInsights: ["Your strongest area is technical knowledge", ...],
  nextSteps: ["Focus on confidence", ...]
}
```

---

## Error Handling

### Comprehensive error handling:

```javascript
try {
  const result = await handleInterviewCompletion(
    interviewId,
    qaPairs,
    domain,
    interviewType
  );

  if (!result.success) {
    // API returned error
    console.error('Scoring failed:', result.error);
    showUserError(result.error);
  } else {
    // Success
    displayResults(result.reportData);
  }
} catch (err) {
  // Network or parsing error
  console.error('Request failed:', err);
  showUserError('Unable to connect to scoring service');
}
```

---

## Environment Setup

### Required environment variables:

```bash
# .env file in internflow-dashboard/
REACT_APP_API_URL=http://localhost:5001
```

### Ensure backend is running:

```bash
# Terminal 1: Start Flask API
cd backend/ml_models
python api.py

# Terminal 2: Start Node.js backend
cd backend
npm start

# Terminal 3: Start React frontend
cd internflow-dashboard
npm start
```

---

## Testing Integration

### Quick test in browser console:

```javascript
// Test scoringAPI directly
import scoringAPI from './services/scoringAPI';

// Test a single Q&A
const result = await scoringAPI.scoreQA(
  "Machine learning is a subset of AI",
  "What is machine learning?",
  "ai_ml"
);
console.log(result);

// Test full session
const sessionResult = await scoringAPI.scoreSession(
  'interview-123',
  [
    { question: "Q1", answer: "A1" },
    { question: "Q2", answer: "A2" }
  ],
  'ai_ml',
  'tr'
);
console.log(sessionResult);
```

---

## Common Integration Issues

| Issue | Solution |
|-------|----------|
| "Cannot find scoringAPI" | Ensure import path is correct: `../services/scoringAPI` |
| "Interview ID is required" | Pass valid interviewId to functions and hooks |
| "Q&A pairs are empty" | Ensure qaPairs is populated before calling score functions |
| "401 Unauthorized" | Check authentication is set up correctly |
| "Cannot connect to backend" | Verify Node.js server running on port 5001 |
| "ML service unavailable" | Verify Flask API running on port 5002 |
| "Components not displaying" | Check CSS files are imported and styling files exist |

---

## Next Steps After Integration

1. ✅ Wire scoring into interview completion
2. ✅ Display results with InterviewResults component
3. Add notifications when interview is scored
4. Add email reports to candidates
5. Add recruiter dashboard with candidate scores
6. Add export/download functionality
7. Add score comparison features
8. Implement retry/retake logic

---

For more detailed information, see:
- [SCORING_SYSTEM_GUIDE.md](../SCORING_SYSTEM_GUIDE.md) - Complete system documentation
- [useScoring Hook Documentation](#) - Custom hook usage
- [scoringAPI Reference](#) - API wrapper methods
- [Component Props Guide](#) - React component interfaces
