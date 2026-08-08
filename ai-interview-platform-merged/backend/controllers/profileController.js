const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');

// Profile pictures for every role — stored on disk under
// backend/uploads/avatars/ and served publicly via express.static
// (see server.js), unlike resumes which stream through an authenticated
// route. Avatars aren't sensitive, and <img> tags can't attach an
// Authorization header, so a public static path is the simplest fit.
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ACCEPTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAccepted = ACCEPTED_MIME_TYPES.has(file.mimetype) || ACCEPTED_EXTENSIONS.has(ext);
  if (!isAccepted) {
    return cb(new Error('Only JPG, PNG, or WEBP images are accepted'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB — plenty for an avatar
}).single('avatar');

function uploadMiddleware(req, res, next) {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
}

// POST /api/users/me/avatar — any authenticated role
async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file received' });
    }

    // Best-effort cleanup of the previous avatar file so uploads/avatars/
    // doesn't grow unbounded every time someone changes their photo.
    const existing = await pool.query('SELECT profile_picture FROM users WHERE id = $1', [req.user.id]);
    const previousUrl = existing.rows[0]?.profile_picture;
    if (previousUrl && previousUrl.startsWith('/uploads/avatars/')) {
      const previousPath = path.join(__dirname, '..', previousUrl);
      fs.unlink(previousPath, () => {}); // ignore errors — file may already be gone
    }

    const publicUrl = `/uploads/avatars/${req.file.filename}`;
    const result = await pool.query(
      `UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, full_name, email, mobile, role, is_active, auth_provider, profile_picture, created_at`,
      [publicUrl, req.user.id]
    );

    res.status(200).json({ message: 'Profile picture updated', user: result.rows[0] });
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ message: 'Server error uploading profile picture' });
  }
}

module.exports = { uploadMiddleware, uploadAvatar };
