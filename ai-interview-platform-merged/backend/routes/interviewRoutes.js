const express = require('express');
const router = express.Router();

const authenticateJWT = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/interviewController');

// -------------------- Candidate --------------------
router.post('/start', authenticateJWT, authorizeRoles('candidate'), ctrl.startInterview);
router.post('/schedule', authenticateJWT, authorizeRoles('candidate'), ctrl.scheduleInterview);

// Module 3: AI Interview Generation — generate an HR / Technical /
// Behavioral / Aptitude / Mixed question set for a new session,
// customized by domain + difficulty.
router.post('/generate', authenticateJWT, authorizeRoles('candidate'), ctrl.generateInterview);

router.patch('/:id/attend', authenticateJWT, authorizeRoles('candidate'), ctrl.attendInterview);
router.patch('/:id/cancel', authenticateJWT, authorizeRoles('candidate'), ctrl.cancelInterview);
router.get('/me', authenticateJWT, authorizeRoles('candidate'), ctrl.listMyInterviews);
router.get('/me/stats', authenticateJWT, authorizeRoles('candidate'), ctrl.myStats);

// -------------------- Coach / Recruiter / Admin --------------------
router.get('/overview', authenticateJWT, authorizeRoles('coach', 'recruiter', 'admin'), ctrl.overviewStats);
router.get('/candidates', authenticateJWT, authorizeRoles('coach', 'recruiter', 'admin'), ctrl.listCandidateSummaries);
router.get('/', authenticateJWT, authorizeRoles('coach', 'recruiter', 'admin'), ctrl.listAllInterviews);
router.patch('/:id/review', authenticateJWT, authorizeRoles('coach', 'recruiter', 'admin'), ctrl.reviewInterview);

// -------------------- Shared session CRUD (Module 3 REST APIs) --------------------
// Candidate (owner) or coach/recruiter/admin can view a session + its
// generated questions; only the owning candidate can edit/delete it,
// and only while it hasn't been completed yet.
router.get('/:id', authenticateJWT, authorizeRoles('candidate', 'coach', 'recruiter', 'admin'), ctrl.getInterviewById);
router.put('/:id', authenticateJWT, authorizeRoles('candidate'), ctrl.updateInterview);
router.delete('/:id', authenticateJWT, authorizeRoles('candidate'), ctrl.deleteInterview);

module.exports = router;
