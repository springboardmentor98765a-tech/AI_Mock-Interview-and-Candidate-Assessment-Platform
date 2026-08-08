const express = require('express');
const router = express.Router();

const authenticateJWT = require('../middleware/authMiddleware');
const { listMyNotifications } = require('../controllers/notificationController');

router.get('/me', authenticateJWT, listMyNotifications);

module.exports = router;
