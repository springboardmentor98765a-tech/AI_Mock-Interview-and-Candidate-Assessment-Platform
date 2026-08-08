const express = require('express');
const router = express.Router();

const authenticateJWT = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
  getStats,
  getInterviews,
  forceDeleteInterview,
  getAnalytics,
  getSettings,
  updateSettings,
} = require('../controllers/adminController');

router.get('/stats', authenticateJWT, authorizeRoles('admin'), getStats);
router.get('/interviews', authenticateJWT, authorizeRoles('admin'), getInterviews);
router.delete('/interviews/:id', authenticateJWT, authorizeRoles('admin'), forceDeleteInterview);
router.get('/analytics', authenticateJWT, authorizeRoles('admin'), getAnalytics);
router.get('/settings', authenticateJWT, authorizeRoles('admin'), getSettings);
router.patch('/settings', authenticateJWT, authorizeRoles('admin'), updateSettings);

module.exports = router;
