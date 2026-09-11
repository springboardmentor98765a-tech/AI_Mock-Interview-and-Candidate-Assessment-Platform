const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Recording = require('../models/Recording');
const Interview = require('../models/Interview');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Ensure uploads directory exists
const uploadDir = './uploads/recordings';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const interviewId = req.params.interviewId || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `recording-${interviewId}-${uniqueSuffix}.webm`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// =============================================
// UPLOAD RECORDING
// =============================================
router.post('/upload/:interviewId', auth, upload.single('recording'), async (req, res) => {
  try {
    const { interviewId } = req.params;
    const file = req.file;
    const { duration } = req.body;
    
    console.log('📤 Upload request received:');
    console.log('  - Interview ID:', interviewId);
    console.log('  - File:', file ? file.filename : 'No file');
    console.log('  - Duration:', duration);
    console.log('  - User:', req.user.id);

    if (!file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ error: 'No recording file uploaded' });
    }

    // Verify the interview belongs to this user
    const interview = await Interview.findById(parseInt(interviewId));
    if (!interview) {
      console.error('❌ Interview not found:', interviewId);
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    if (interview.user_id !== req.user.id) {
      console.error('❌ Unauthorized - User:', req.user.id, 'Interview owner:', interview.user_id);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    console.log('✅ Interview verified, creating recording record...');

    const recording = await Recording.create({
      interview_id: parseInt(interviewId),
      user_id: req.user.id,
      file_path: file.path,
      file_name: file.filename,
      file_size: file.size,
      duration: parseInt(duration) || 0
    });

    console.log('✅ Recording saved to database:', recording.id);

    res.json({
      message: 'Recording uploaded successfully',
      recording: {
        id: recording.id,
        file_name: recording.file_name,
        file_size: recording.file_size,
        duration: recording.duration,
        created_at: recording.created_at
      }
    });
  } catch (error) {
    console.error('❌ Upload recording error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// =============================================
// GET ALL RECORDINGS FOR USER
// =============================================
router.get('/', auth, async (req, res) => {
  try {
    console.log('📊 Fetching recordings for user:', req.user.id);
    const recordings = await Recording.findByUserId(req.user.id);
    console.log('📊 Found:', recordings.length, 'recordings');
    res.json(recordings);
  } catch (error) {
    console.error('❌ Get recordings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// GET RECORDINGS FOR SPECIFIC INTERVIEW
// =============================================
router.get('/interview/:interviewId', auth, async (req, res) => {
  try {
    const { interviewId } = req.params;
    console.log('📊 Fetching recordings for interview:', interviewId);
    
    const interview = await Interview.findById(parseInt(interviewId));
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    if (interview.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const recordings = await Recording.findByInterviewId(interviewId);
    res.json(recordings);
  } catch (error) {
    console.error('❌ Get interview recordings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// GET RECORDING FILE
// =============================================
// GET RECORDING FILE - Supports header and query token
router.get('/file/:id', async (req, res) => {
  try {
    // Check for token in header or query parameter
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    // If no token in header, check query parameter
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const recording = await Recording.findById(req.params.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Check if user owns this recording
    if (recording.user_id !== decoded.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!fs.existsSync(recording.file_path)) {
      return res.status(404).json({ error: 'Recording file not found' });
    }

    res.sendFile(path.resolve(recording.file_path));
  } catch (error) {
    console.error('❌ Get recording file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// DELETE RECORDING
// =============================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    if (recording.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (fs.existsSync(recording.file_path)) {
      fs.unlinkSync(recording.file_path);
      console.log('🗑️ Deleted file:', recording.file_path);
    }

    await Recording.delete(req.params.id);
    console.log('🗑️ Deleted recording record:', req.params.id);

    res.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('❌ Delete recording error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;