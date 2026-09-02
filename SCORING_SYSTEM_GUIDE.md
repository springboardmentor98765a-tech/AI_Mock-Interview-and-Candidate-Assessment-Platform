# AI Mock Interview Platform - Scoring System Implementation Guide

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Components Overview](#components-overview)
3. [Integration Guide](#integration-guide)
4. [API Reference](#api-reference)
5. [Frontend Usage](#frontend-usage)
6. [Database Schema](#database-schema)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)

---

## System Architecture

The scoring system is built on a **4-layer architecture**:

```
┌─────────────────────────────────────────────────┐
│         React Frontend Layer                    │
│  (PerformanceReport, ScoreCard, ScoreHistory)   │
└──────────────┬──────────────────────────────────┘
               │ HTTP Requests
┌──────────────▼──────────────────────────────────┐
│       Node.js Express Backend Layer              │
│  (Routes: /api/scoring, Service: scoringService)│
└──────────────┬──────────────────────────────────┘
               │ HTTP REST Calls
┌──────────────▼──────────────────────────────────┐
│    Flask ML API Layer (Port 5002)               │
│  (api.py - 7 REST endpoints)                    │
└──────────────┬──────────────────────────────────┘
               │ Python Function Calls
┌──────────────▼──────────────────────────────────┐
│    Python Scoring Engine (scoring_engine.py)    │
│  (Core scoring logic with 20+ evaluation methods)│
└─────────────────────────────────────────────────┘
```

### Scoring Dimensions

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| Communication | 30% | Clarity, grammar, filler words, speaking pace, completeness |
| Confidence | 25% | Eye contact, facial engagement, hesitation, speaking confidence |
| Technical Relevance | 30% | Technical accuracy, keyword relevance, problem-solving |
| Professionalism | 15% | Time management, organization, professional communication |

---

## Components Overview

### Backend Components

#### 1. **Python Scoring Engine** (`backend/ml_models/scoring_engine.py`)
- **Purpose**: Core scoring logic independent of frameworks
- **Main Class**: `ScoringEngine`
- **Key Methods**:
  - `calculate_communication_score(answer, expected_answer)` → float (0-100)
  - `calculate_confidence_score(answer, behavioral_data)` → float (0-100)
  - `calculate_technical_relevance_score(answer, domain, keywords)` → float (0-100)
  - `calculate_professionalism_score(answer, response_length)` → float (0-100)
  - `evaluate_comprehensive(qa_pair, domain, behavioral_data)` → dict
  - `evaluate_interview_session(qa_pairs, domain, behavioral_data)` → dict

#### 2. **Flask API** (`backend/ml_models/api.py`)
- **Purpose**: REST interface to Python scoring engine
- **Port**: 5002
- **Endpoints**:

```python
POST /api/score/comprehensive
  Request: { answer, question, expected_answer, domain, behavioral_data }
  Response: { score, details, breakdown }

POST /api/score/communication
  Request: { answer, expected_answer }
  Response: { score, details }

POST /api/score/confidence
  Request: { answer, behavioral_data }
  Response: { score, details }

POST /api/score/technical
  Request: { answer, domain, keywords }
  Response: { score, details }

POST /api/score/professionalism
  Request: { answer, response_length }
  Response: { score, details }

POST /api/score/overall
  Request: { communication, confidence, technical, professionalism }
  Response: { score }

POST /api/score/session
  Request: { qa_pairs, domain, behavioral_data }
  Response: { session_summary, qa_evaluations }
```

#### 3. **Scoring Service** (`backend/services/scoringService.js`)
- **Purpose**: Node.js wrapper for Flask API with feedback generation
- **Key Methods**:
  - `scoreCommunication(answer, expectedAnswer)` → Promise
  - `scoreConfidence(answer, behavioralData)` → Promise
  - `scoreTechnical(answer, domain, keywords)` → Promise
  - `scoreProfessionalism(answer, responseLength)` → Promise
  - `evaluateQA(qaData)` → Promise
  - `evaluateSession(qaList, domain, behavioralData)` → Promise
  - `generateAIFeedback(evaluation)` → object
  - `generatePerformanceReport(sessionEvaluation)` → object

**Configuration**:
```javascript
const ML_API_BASE = process.env.ML_API_BASE || 'http://localhost:5002';
```

#### 4. **Backend Routes** (`backend/routes/scoring.js`)
- **Purpose**: Express REST API for frontend consumption
- **Base Path**: `/api/scoring`

**Routes**:
```
POST   /qa                          - Score single Q&A
POST   /session                     - Score entire session + persist
POST   /dimension/communication     - Individual dimension scoring
POST   /dimension/confidence
POST   /dimension/technical
POST   /dimension/professionalism
POST   /feedback/generate           - Generate AI feedback
GET    /:interview_id               - Get scores for interview
GET    /:interview_id/report        - Get detailed report
GET    /                            - Get user's interview history
GET    /dashboard/summary           - Performance metrics
```

#### 5. **Interview Model** (`backend/models/Interview.js`)
- **New Methods**:
  - `updateDetailedScores(id, scoreBreakdown)` - Store dimension scores
  - `findByIdWithScores(id)` - Retrieve with parsed feedback
  - `updateAIFeedback(id, feedbackData)` - Store AI feedback
  - `getUserPerformanceMetrics(user_id)` - Aggregate statistics
  - `getScoreHistory(user_id, limit)` - Trend data

### Frontend Components

#### 1. **PerformanceReport.jsx**
- **Purpose**: Main report display component
- **Props**:
  ```javascript
  {
    overallScore: number,
    performanceRating: string,
    performanceBreakdown: {
      communication: { score, category, details },
      confidence: { score, category, details },
      technicalRelevance: { score, category, details },
      professionalism: { score, category, details }
    },
    feedback: {
      strengths: array,
      weaknesses: array,
      improvements: array,
      recommendations: array,
      practiceAreas: object,
      learningResources: array
    },
    keyInsights: array,
    nextSteps: array
  }
  ```

#### 2. **ScoreCard.jsx**
- **Purpose**: Display individual dimension scores
- **Props**: `title`, `score`, `category`, `details`, `breakdown`
- **Features**: Color-coded badges, progress bars, expandable details

#### 3. **AIFeedback.jsx**
- **Purpose**: Display AI-generated feedback sections
- **Props**: `feedback` object
- **Features**: Expandable sections with icons, smooth animations

#### 4. **ScoreHistory.jsx**
- **Purpose**: Display score trends and history
- **Features**: 
  - Bar chart visualization
  - Statistics (attempts, average, highest, progress)
  - Historical table with sorting

---

## Integration Guide

### Step 1: Backend Setup

1. **Ensure Python services running**:
```bash
# In ml_env folder
cd backend/ml_models
python api.py  # Runs on port 5002
```

2. **Verify Express server**:
```bash
cd backend
npm install
npm start  # Runs on port 5001
```

3. **Check environment variables** in `backend/.env`:
```env
ML_API_BASE=http://localhost:5002
DATABASE_URL=postgresql://...
```

### Step 2: Frontend Integration

1. **Create API hooks** (`internflow-dashboard/src/services/scoringAPI.js`):
```javascript
export const scoringAPI = {
  scoreQA: async (answer, question, domain) => {
    return fetch('/api/scoring/qa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, question, domain })
    }).then(r => r.json());
  },

  scoreSession: async (qaPairs, domain) => {
    return fetch('/api/scoring/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qa_pairs: qaPairs, domain })
    }).then(r => r.json());
  },

  getReport: async (interviewId) => {
    return fetch(`/api/scoring/${interviewId}/report`)
      .then(r => r.json());
  },

  getHistory: async () => {
    return fetch('/api/scoring/').then(r => r.json());
  }
};
```

2. **Wire into Interview Component**:
```javascript
// In WebcamRecorder or interview completion handler
const handleInterviewComplete = async (qaPairs, domain) => {
  const response = await scoringAPI.scoreSession(qaPairs, domain);
  setReportData(response.data);
  setShowReport(true);
};
```

3. **Display Report**:
```javascript
{showReport && <PerformanceReport reportData={reportData} />}
```

### Step 3: Database Schema Verification

The system gracefully handles two scenarios:

**Option A: Using separate columns** (recommended for performance):
```sql
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS communication_score DECIMAL(5,2);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS technical_score DECIMAL(5,2);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS professionalism_score DECIMAL(5,2);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS score_breakdown JSONB;
```

**Option B: Using JSON storage** (automatic fallback):
- All scores stored in `feedback` JSON column
- No schema changes required
- Slightly slower for querying but more flexible

---

## API Reference

### POST /api/scoring/qa
Score a single question-answer pair.

**Request**:
```json
{
  "answer": "The answer text from the candidate",
  "question": "What is the question being answered?",
  "expected_answer": "Optional: Expected answer for comparison",
  "domain": "ai_ml|sde|hr",
  "behavioral_data": {
    "eyeContactPercentage": 85,
    "engagementScore": 0.8,
    "attentionScore": 0.9
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "qa_evaluation": {
      "overall_score": 78.5,
      "individual_evaluations": {
        "communication": { "score": 80, "category": "Good", "details": {...} },
        "confidence": { "score": 75, "category": "Good", "details": {...} },
        "technical": { "score": 82, "category": "Good", "details": {...} },
        "professionalism": { "score": 75, "category": "Good", "details": {...} }
      }
    }
  }
}
```

### POST /api/scoring/session
Score entire interview session and persist to database.

**Request**:
```json
{
  "interview_id": "uuid",
  "qa_pairs": [
    { "question": "Q1", "answer": "A1", "expected_answer": "E1" },
    { "question": "Q2", "answer": "A2", "expected_answer": "E2" }
  ],
  "domain": "ai_ml|sde|hr",
  "interview_type": "tr|mr|hr",
  "behavioral_data": { ... }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "interview_id": "uuid",
    "overall_score": 75.8,
    "performance_rating": "Good",
    "performance_breakdown": {
      "communication": { "score": 78, ... },
      "confidence": { "score": 72, ... },
      "technicalRelevance": { "score": 76, ... },
      "professionalism": { "score": 76, ... }
    },
    "feedback": {
      "strengths": ["Clear communication", ...],
      "weaknesses": ["Needs better body language", ...],
      "improvements": ["Practice eye contact", ...],
      "recommendations": ["Take a course on X", ...],
      "practiceAreas": {
        "Communication": { "current": 78, "target": 90 }
      },
      "learningResources": [
        { "title": "...", "url": "...", "type": "video|article" }
      ]
    },
    "key_insights": ["...", "..."],
    "next_steps": ["...", "..."]
  }
}
```

### GET /api/scoring/dashboard/summary
Get performance metrics for dashboard.

**Response**:
```json
{
  "success": true,
  "data": {
    "total_interviews": 5,
    "completed_interviews": 5,
    "average_score": 73.2,
    "highest_score": 82.1,
    "lowest_score": 62.5,
    "by_rating": {
      "excellent": 1,
      "good": 2,
      "average": 2,
      "needs_improvement": 0,
      "poor": 0
    },
    "score_trend": [
      { "score": 68.5, "date": "2024-01-01", "type": "tr" },
      { "score": 72.1, "date": "2024-01-05", "type": "tr" }
    ]
  }
}
```

---

## Frontend Usage

### Display Report After Interview Completion

```javascript
import PerformanceReport from './components/PerformanceReport';
import ScoreHistory from './components/ScoreHistory';

function CandidateDashboard() {
  const [reportData, setReportData] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);

  useEffect(() => {
    // Fetch report and history
    fetchReport();
    fetchScoreHistory();
  }, []);

  const fetchReport = async () => {
    const response = await fetch(`/api/scoring/${interviewId}/report`);
    const data = await response.json();
    setReportData(data.data);
  };

  const fetchScoreHistory = async () => {
    const response = await fetch('/api/scoring/');
    const data = await response.json();
    setScoreHistory(data.data.interviews);
  };

  return (
    <div>
      {reportData && <PerformanceReport reportData={reportData} />}
      {scoreHistory.length > 0 && <ScoreHistory scores={scoreHistory} />}
    </div>
  );
}
```

### Real-time Scoring During Interview

```javascript
import { scoringAPI } from './services/scoringAPI';

async function handleAnswerSubmit(answer, question, domain) {
  try {
    const result = await scoringAPI.scoreQA(answer, question, domain);
    console.log('Score:', result.data.qa_evaluation.overall_score);
    // Update UI with score
  } catch (error) {
    console.error('Scoring failed:', error);
  }
}
```

---

## Database Schema

### interviews table (Enhanced)

```sql
CREATE TABLE interviews (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  interview_type VARCHAR(10) NOT NULL,
  domain VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20),
  questions JSONB,
  answers JSONB,
  
  -- Score columns (Optional but recommended)
  score DECIMAL(5, 2),
  communication_score DECIMAL(5, 2),
  confidence_score DECIMAL(5, 2),
  technical_score DECIMAL(5, 2),
  professionalism_score DECIMAL(5, 2),
  score_breakdown JSONB,
  
  -- Feedback
  feedback JSONB,
  performance_rating VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

---

## Configuration

### Environment Variables

```env
# Backend
ML_API_BASE=http://localhost:5002
DATABASE_URL=postgresql://user:password@localhost/dbname
FLASK_ENV=production

# Flask/Python
FLASK_PORT=5002
PYTHONPATH=./backend/ml_models

# Frontend
REACT_APP_API_URL=http://localhost:5001
```

### Scoring Weights (in `scoring_engine.py`)

```python
WEIGHTS = {
    'communication': 0.30,
    'confidence': 0.25,
    'technical': 0.30,
    'professionalism': 0.15
}

THRESHOLDS = {
    'excellent': 90,
    'good': 75,
    'average': 60,
    'needs_improvement': 40,
    'poor': 0
}
```

---

## Troubleshooting

### Issue: "Cannot connect to ML API"

**Solution**:
1. Verify Flask server is running: `python backend/ml_models/api.py`
2. Check ML_API_BASE environment variable
3. Test manually: `curl http://localhost:5002/api/score/health`

### Issue: "Scoring returns NaN"

**Solution**:
1. Verify answer text is not empty
2. Check that domain is one of: `ai_ml`, `sde`, `hr`
3. Ensure behavioral_data format is correct (if provided)

### Issue: "Feedback section shows [object Object]"

**Solution**:
1. Check `AIFeedback.jsx` handles nested objects correctly
2. Verify feedback object structure matches expected format
3. Add null checks for optional fields

### Issue: "Scores not persisting to database"

**Solution**:
1. Verify Interview.updateScoreAndFeedback() is called
2. Check database connection and table permissions
3. Verify feedback column exists and has type JSONB

### Issue: "ScoreHistory chart not rendering"

**Solution**:
1. Ensure score history API returns array of objects
2. Verify each object has `score`, `created_at`, `interview_type` fields
3. Check browser console for rendering errors

---

## Performance Optimization

### Caching Recommendations

```javascript
// Cache score calculations for same answer
const scoreCache = new Map();

const getCachedScore = (answer, question) => {
  const key = `${answer}:${question}`;
  if (scoreCache.has(key)) return scoreCache.get(key);
  return null;
};
```

### Batch Scoring

For multiple interviews, use session endpoint instead of individual QA scoring:

```javascript
// Instead of:
for (const qa of qaPairs) {
  await scoreQA(qa); // 5 API calls
}

// Do this:
await scoreSession(qaPairs); // 1 API call
```

---

## Testing

### Unit Testing (Python)

```python
from backend.ml_models.scoring_engine import ScoringEngine

engine = ScoringEngine()

# Test communication scoring
score = engine.calculate_communication_score(
    "Good answer with complete thoughts",
    "What is machine learning?"
)
assert 70 <= score <= 90
```

### Integration Testing (Node.js)

```javascript
const { scoringService } = require('./services/scoringService');

test('evaluateQA returns valid score', async () => {
  const result = await scoringService.evaluateQA({
    question: 'Explain ML',
    answer: 'ML is...',
    domain: 'ai_ml'
  });

  expect(result.overall_score).toBeLessThanOrEqual(100);
  expect(result.individual_evaluations).toBeDefined();
});
```

### E2E Testing (React)

```javascript
test('PerformanceReport displays all scores', () => {
  const mockData = {
    overallScore: 75,
    performanceBreakdown: {
      communication: { score: 78 },
      confidence: { score: 72 },
      technicalRelevance: { score: 76 },
      professionalism: { score: 76 }
    }
  };

  render(<PerformanceReport reportData={mockData} />);
  expect(screen.getByText('75.0')).toBeInTheDocument();
});
```

---

## Next Steps

1. **Frontend API Integration**: Create `scoringAPI.js` with all endpoint wrappers
2. **Wire Interview Submission**: Integrate scoring into WebcamRecorder completion
3. **Dashboard Integration**: Add score display to CandidateDashboard
4. **Score History Visualization**: Implement trend charts with Chart.js
5. **Testing**: Write comprehensive tests for all components
6. **Performance**: Monitor and optimize API response times
7. **Analytics**: Track scoring metrics for system improvement

---

For more details, refer to individual component documentation in their JSDoc comments.
