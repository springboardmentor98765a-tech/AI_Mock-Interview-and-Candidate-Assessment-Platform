const express = require('express');
const router = express.Router();

const authenticateJWT = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/resumeController');

// -------------------- Candidate --------------------
router.post(
  '/upload',
  authenticateJWT,
  authorizeRoles('candidate'),
  ctrl.uploadMiddleware,
  ctrl.uploadResume
);
router.get('/me', authenticateJWT, authorizeRoles('candidate'), ctrl.listMyResumes);
router.get('/me/latest', authenticateJWT, authorizeRoles('candidate'), ctrl.getLatestResume);
router.delete('/:id', authenticateJWT, authorizeRoles('candidate'), ctrl.deleteResume);

// -------------------- Shared (owner candidate, or coach/recruiter/admin) --------------------
router.get('/:id', authenticateJWT, authorizeRoles('candidate', 'coach', 'recruiter', 'admin'), ctrl.getResumeById);
router.get('/:id/file', authenticateJWT, authorizeRoles('candidate', 'coach', 'recruiter', 'admin'), ctrl.downloadResumeFile);

module.exports = router;
