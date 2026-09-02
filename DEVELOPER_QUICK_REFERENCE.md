# Scoring System - Developer Quick Reference

## 🚀 Quick Start Commands

```bash
# 1. Start Flask ML API (Terminal 1)
cd backend/ml_models
python api.py

# 2. Start Node.js Backend (Terminal 2)
cd backend
npm start

# 3. Start React Frontend (Terminal 3)
cd internflow-dashboard
npm start
```

---

## 📁 Key Files Reference

### Backend Files

| File | Purpose | Key Exports |
|------|---------|------------|
| `backend/ml_models/scoring_engine.py` | Core scoring logic | `ScoringEngine` class |
| `backend/ml_models/api.py` | Flask REST endpoints | 7 scoring endpoints |
| `backend/services/scoringService.js` | Node wrapper + feedback | `scoringService` object |
| `backend/routes/scoring.js` | Express routes | `/api/scoring/*` endpoints |
| `backend/models/Interview.js` | Database model | Interview CRUD + scoring |

### Frontend Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `PerformanceReport.jsx` | Main report display | `reportData` |
| `ScoreCard.jsx` | Individual score card | `title`, `score`, `breakdown` |
| `AIFeedback.jsx` | Feedback sections | `feedback` object |
| `ScoreHistory.jsx` | Score trends/charts | `scores` array |
| `InterviewResults.jsx` | Results page | `interviewId`, callbacks |

### Frontend Services & Hooks

| File | Exports | Usage |
|------|---------|-------|
| `services/scoringAPI.js` | `scoringAPI` object | API calls |
| `services/mlapi.js` | Various ML endpoints | Speech analysis, etc |
| `hooks/useScoring.js` | `useScoring` hook | State management |
| `utils/scoringUtils.js` | 12+ utility functions | Data transformation |
| `integrations/interviewSubmissionHandler.js` | Handler functions | Interview completion |

---

## 💻 Common Code Snippets

### Display Interview Results

```javascript
import InterviewResults from './components/InterviewResults';

<InterviewResults
  interviewId={id}
  onRetake={() => handleRetake()}
  onNavigate={(page) => navigate(page)}
  showHistory={true}
/>
```

### Score an Interview

```javascript
import { handleInterviewCompletion } from './integrations/interviewSubmissionHandler';

const result = await handleInterviewCompletion(
  interviewId,
  qaPairs,
  'ai_ml',    // domain
  'tr',       // interview type
  behavioralData
);
```

### Use Scoring Hook

```javascript
import useScoring from './hooks/useScoring';

const { scoreSession, reportData, loading } = useScoring(interviewId);
await scoreSession(qaPairs, 'ai_ml', 'tr');
```

### Call API Directly

```javascript
import { scoringAPI } from './services/scoringAPI';

const result = await scoringAPI.scoreSession(
  interviewId,
  qaPairs,
  domain,
  interviewType
);
```

### Transform Data

```javascript
import { transformReportData } from './utils/scoringUtils';

const formatted = transformReportData(apiResponse);
```

---

## 📊 Data Structures

### Q&A Pair
```javascript
{
  question: "What is ML?",
  answer: "Candidate's answer",
  expected_answer: "Reference answer (optional)"
}
```

### Report Data
```javascript
{
  overallScore: 78.5,
  performanceRating: "Good",
  performanceBreakdown: {
    communication: { score: 80, category: "Good", details: {} },
    confidence: { score: 75, ... },
    technicalRelevance: { score: 82, ... },
    professionalism: { score: 75, ... }
  },
  feedback: {
    strengths: [],
    weaknesses: [],
    improvements: [],
    recommendations: [],
    practiceAreas: {},
    learningResources: []
  },
  keyInsights: [],
  nextSteps: []
}
```

### Behavioral Data (Optional)
```javascript
{
  eyeContactPercentage: 75,    // 0-100
  engagementScore: 0.85,       // 0-1
  attentionScore: 0.90         // 0-1
}
```

---

## 🔗 API Endpoints

### Scoring Endpoints
```
POST   /api/scoring/qa                          Score Q&A pair
POST   /api/scoring/session                     Score full session
POST   /api/scoring/dimension/communication     Score dimension
GET    /api/scoring/:interview_id               Get scores
GET    /api/scoring/:interview_id/report        Get report
GET    /api/scoring/                            Get history
GET    /api/scoring/dashboard/summary           Get metrics
```

### Response Format
```json
{
  "success": true,
  "data": {
    "overall_score": 78.5,
    "performance_breakdown": { ... },
    "feedback": { ... }
  }
}
```

---

## 🎨 Styling Classes

### Colors
```css
.score-excellent { background: #4CAF50; }  /* 90+ */
.score-good      { background: #8BC34A; }  /* 75-89 */
.score-average   { background: #FFC107; }  /* 60-74 */
.score-improve   { background: #FF9800; }  /* 40-59 */
.score-poor      { background: #F44336; }  /* <40 */
```

### Utility Functions
```javascript
getScoreCategory(78) → "Good"
getScoreColor(78) → "#8BC34A"
calculateOverallScore(breakdown) → 78.5
formatScore(78.5, 1) → "78.5"
transformReportData(response) → formatted
calculateScoreStats(scores) → { avg, min, max, trend }
```

---

## 🧪 Testing

### Test Individual Component
```javascript
import { render, screen } from '@testing-library/react';
import ScoreCard from './ScoreCard';

test('renders score card', () => {
  render(<ScoreCard title="Communication" score={80} />);
  expect(screen.getByText('Communication')).toBeInTheDocument();
});
```

### Test Scoring API
```javascript
import { scoringAPI } from './services/scoringAPI';

test('scoreQA returns valid result', async () => {
  const result = await scoringAPI.scoreQA(
    'Test answer',
    'Test question',
    'ai_ml'
  );
  expect(result.success).toBe(true);
  expect(result.data.qa_evaluation.overall_score).toBeLessThanOrEqual(100);
});
```

---

## 🐛 Debugging Tips

### Enable verbose logging
```javascript
// In your component
const result = await scoringAPI.scoreSession(...);
console.log('Full response:', result);
console.log('Report data:', result.data);
```

### Check browser console
- API errors appear in Network tab
- Component errors in Console tab
- State changes visible with React DevTools

### Verify backend connectivity
```bash
# Check Flask is running
curl http://localhost:5002/api/score/health

# Check Node backend
curl http://localhost:5001/api/scoring/health
```

### Test with mock data
```javascript
const mockReport = {
  overallScore: 85,
  performanceRating: "Good",
  performanceBreakdown: {
    communication: { score: 85, category: "Good", details: {} },
    // ... rest of structure
  }
};
<PerformanceReport reportData={mockReport} />
```

---

## 📝 Environment Variables

```env
# Frontend (.env in internflow-dashboard/)
REACT_APP_API_URL=http://localhost:5001

# Backend (.env in backend/)
ML_API_BASE=http://localhost:5002
DATABASE_URL=postgresql://...
```

---

## 🔍 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Cannot find module scoringAPI" | Check import path: `../services/scoringAPI` |
| "Loading spinner stuck" | Check backend URLs in environment |
| "Score not persisting" | Verify database connection |
| "Components show [object Object]" | Ensure data is transformed correctly |
| "401 Unauthorized" | Check auth token/cookies are being sent |

---

## 📚 Documentation Files

| File | Content |
|------|---------|
| `SCORING_SYSTEM_GUIDE.md` | Complete system documentation (400+ lines) |
| `SCORING_IMPLEMENTATION_README.md` | Component overview & quick reference |
| `INTEGRATION_GUIDE.md` | Step-by-step integration instructions |
| `API_REFERENCE.md` | (In SCORING_SYSTEM_GUIDE.md) Detailed endpoint docs |

---

## 🎯 Integration Checklist

- [ ] Flask API running on port 5002
- [ ] Node backend running on port 5001
- [ ] React frontend running on port 3000
- [ ] Database connection verified
- [ ] Interview model enhanced with new methods
- [ ] Routes registered in server.js
- [ ] useScoring hook tested
- [ ] InterviewResults component displays correctly
- [ ] Score history chart renders
- [ ] API calls working end-to-end
- [ ] Error handling in place
- [ ] All components styled properly

---

## 🚀 Next Steps

1. **Wire into Interview Flow**
   - Call `handleInterviewCompletion()` on interview end
   - Show `InterviewResults` component

2. **Add to Dashboard**
   - Display score summary in CandidateDashboard
   - Show score trends with ScoreHistory

3. **Recruiter Features**
   - Add recruiter view for all scores
   - Create candidate comparison tool

4. **Enhancements**
   - PDF report download
   - Email reports to candidates
   - Custom scoring rules by role
   - Analytics and insights

---

## 📞 Support Resources

- Check component JSDoc comments for detailed prop documentation
- Run `npm test` to validate components
- Check browser DevTools → Application → localStorage for session data
- Review logs in terminal where backend services are running

---

**Last Updated**: 2024
**Status**: ✅ Complete and ready for integration
