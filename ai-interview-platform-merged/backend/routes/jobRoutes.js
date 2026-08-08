const express = require('express');
const router = express.Router();

const authenticateJWT = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { listJobs, createJob, toggleJobStatus } = require('../controllers/jobController');

router.get('/', authenticateJWT, authorizeRoles('recruiter', 'admin'), listJobs);
router.post('/', authenticateJWT, authorizeRoles('recruiter', 'admin'), createJob);
router.patch('/:id/status', authenticateJWT, authorizeRoles('recruiter', 'admin'), toggleJobStatus);

module.exports = router;
