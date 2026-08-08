const express = require('express');
const router = express.Router();

const authenticateJWT = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { listContacts, getConversation, sendMessage } = require('../controllers/chatController');

router.get('/contacts', authenticateJWT, authorizeRoles('candidate', 'coach'), listContacts);
router.get('/:userId', authenticateJWT, authorizeRoles('candidate', 'coach'), getConversation);
router.post('/:userId', authenticateJWT, authorizeRoles('candidate', 'coach'), sendMessage);

module.exports = router;
