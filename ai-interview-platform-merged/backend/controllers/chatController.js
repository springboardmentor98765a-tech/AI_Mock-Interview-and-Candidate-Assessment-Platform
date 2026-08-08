const pool = require('../config/db');
const { ensureTable } = require('../utils/chatStore');
const { notify } = require('../utils/notify');

// Chat is scoped to candidate<->coach conversations only — that's the
// specific relationship the feature is for (coach gives feedback,
// candidate follows up and improves). Keeps this from becoming an open
// inbox between every role on the platform.
function alliedRole(role) {
  if (role === 'candidate') return 'coach';
  if (role === 'coach') return 'candidate';
  return null;
}

// GET /api/chat/contacts
async function listContacts(req, res) {
  try {
    await ensureTable();
    const partnerRole = alliedRole(req.user.role);
    if (!partnerRole) {
      return res.status(403).json({ message: 'Chat is only available between candidates and coaches' });
    }
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.profile_picture,
              lm.message AS last_message,
              lm.created_at AS last_message_at,
              COALESCE(unread.unread_count, 0) AS unread_count
       FROM users u
       LEFT JOIN LATERAL (
         SELECT message, created_at FROM messages m
         WHERE (m.sender_id = u.id AND m.receiver_id = $1)
            OR (m.sender_id = $1 AND m.receiver_id = u.id)
         ORDER BY m.created_at DESC LIMIT 1
       ) lm ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_count FROM messages m
         WHERE m.sender_id = u.id AND m.receiver_id = $1 AND m.read_at IS NULL
       ) unread ON true
       WHERE u.role = $2
       ORDER BY lm.created_at DESC NULLS LAST, u.full_name ASC`,
      [req.user.id, partnerRole]
    );
    res.status(200).json({ contacts: result.rows });
  } catch (err) {
    console.error('List chat contacts error:', err);
    res.status(500).json({ message: 'Server error fetching contacts' });
  }
}

// GET /api/chat/:userId — conversation history, and marks their
// messages to me as read.
async function getConversation(req, res) {
  try {
    await ensureTable();
    const otherUserId = Number(req.params.userId);
    const partnerRole = alliedRole(req.user.role);
    if (!partnerRole) {
      return res.status(403).json({ message: 'Chat is only available between candidates and coaches' });
    }
    const otherUser = await pool.query('SELECT id, role FROM users WHERE id = $1', [otherUserId]);
    if (otherUser.rows.length === 0 || otherUser.rows[0].role !== partnerRole) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    await pool.query(
      `UPDATE messages SET read_at = NOW()
       WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL`,
      [otherUserId, req.user.id]
    );

    const result = await pool.query(
      `SELECT id, sender_id, receiver_id, message, created_at
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC
       LIMIT 300`,
      [req.user.id, otherUserId]
    );
    res.status(200).json({ messages: result.rows });
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ message: 'Server error fetching conversation' });
  }
}

// POST /api/chat/:userId  { message }
async function sendMessage(req, res) {
  try {
    await ensureTable();
    const otherUserId = Number(req.params.userId);
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }
    const partnerRole = alliedRole(req.user.role);
    if (!partnerRole) {
      return res.status(403).json({ message: 'Chat is only available between candidates and coaches' });
    }
    const otherUser = await pool.query('SELECT id, role FROM users WHERE id = $1', [otherUserId]);
    if (otherUser.rows.length === 0 || otherUser.rows[0].role !== partnerRole) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, otherUserId, message.trim()]
    );

    await notify({
      userId: otherUserId,
      title: 'New Message',
      message: `${req.user.fullName || 'Someone'} sent you a message.`,
    });

    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error sending message' });
  }
}

module.exports = { listContacts, getConversation, sendMessage };
