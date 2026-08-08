const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

const pool = require('../config/db');
const { analyzeResumeText } = require('../utils/resumeEngine');
const { notify } = require('../utils/notify');

// ---------------------------------------------------------------
// Feature 1: Resume upload — PDF, JPG, or PNG.
// Stores the file on disk under backend/uploads/resumes/ with a
// collision-proof name; up to 8MB.
// ---------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'resumes');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ACCEPTED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const ACCEPTED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${req.user.id}-${Date.now()}-${safeOriginal}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAccepted = ACCEPTED_MIME_TYPES.has(file.mimetype) || ACCEPTED_EXTENSIONS.has(ext);
  if (!isAccepted) {
    return cb(new Error('Only PDF, JPG, or PNG files are accepted'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
}).single('resume');

// Wraps multer's callback-style middleware so route handlers below
// can just `await` a normal async function and get clean JSON errors.
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

function isImageFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  return file.mimetype.startsWith('image/') || ['.jpg', '.jpeg', '.png'].includes(ext);
}

// ---------------------------------------------------------------
// POST /api/resumes/upload (candidate) — upload a PDF/JPG/PNG resume,
// extract its text (pdf-parse for PDFs, tesseract.js OCR for images),
// and run the full Module 2 analysis pipeline: skill extraction,
// technology detection, experience parsing, education analysis,
// resume summary, and ATS-friendliness scoring — all in one call.
// ---------------------------------------------------------------
async function uploadResume(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'A PDF, JPG, or PNG resume file is required (field name: "resume")' });
    }

    const candidateId = req.user.id;
    const fileIsImage = isImageFile(req.file);
    const fileType = fileIsImage ? 'image' : 'pdf';

    let rawText = '';
    try {
      if (fileIsImage) {
        // OCR — tesseract.js downloads its English language model from a
        // CDN the first time it runs, then caches it locally afterward.
        const {
          data: { text },
        } = await Tesseract.recognize(req.file.path, 'eng');
        rawText = text || '';
      } else {
        const buffer = fs.readFileSync(req.file.path);
        const parsed = await pdfParse(buffer);
        rawText = parsed.text || '';
      }
    } catch (parseErr) {
      console.error(`${fileIsImage ? 'OCR' : 'PDF parse'} error:`, parseErr);
      fs.unlink(req.file.path, () => {});
      return res.status(422).json({
        message: fileIsImage
          ? 'Could not read text from this image. Please upload a clear, well-lit photo/scan of your resume.'
          : 'Could not read this PDF. Please upload a valid, text-based PDF resume.',
      });
    }

    if (!rawText.trim()) {
      fs.unlink(req.file.path, () => {});
      return res.status(422).json({
        message: fileIsImage
          ? 'No extractable text found in this image. Try a clearer, higher-resolution photo/scan.'
          : 'No extractable text found in this PDF (it may be a scanned image — try uploading it as a JPG/PNG instead so OCR can run).',
      });
    }

    const analysis = analyzeResumeText(rawText);

    const result = await pool.query(
      `INSERT INTO resumes
         (candidate_id, original_name, file_path, file_size, file_type, raw_text,
          skills, technologies, experience_years, experience_entries, education, summary,
          ats_score, ats_feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, candidate_id, original_name, file_size, file_type, skills, technologies,
                 experience_years, experience_entries, education, summary,
                 ats_score, ats_feedback, created_at`,
      [
        candidateId,
        req.file.originalname,
        req.file.path,
        req.file.size,
        fileType,
        rawText,
        JSON.stringify(analysis.skills),
        JSON.stringify(analysis.technologies),
        analysis.experienceYears,
        JSON.stringify(analysis.experienceEntries),
        JSON.stringify(analysis.education),
        analysis.summary,
        analysis.atsScore,
        JSON.stringify(analysis.atsFeedback),
      ]
    );

    await notify({
      userId: candidateId,
      title: 'Resume Analyzed',
      message: `We extracted ${analysis.skills.length} skills from "${req.file.originalname}" (ATS score: ${analysis.atsScore}/100).`,
    });

    return res.status(201).json({ resume: result.rows[0] });
  } catch (err) {
    console.error('Upload resume error:', err);
    return res.status(500).json({ message: 'Server error processing resume' });
  }
}

// ---------------------------------------------------------------
// GET /api/resumes/me (candidate) — all of the candidate's uploaded
// resumes, most recent first (excludes the heavy raw_text field).
// ---------------------------------------------------------------
async function listMyResumes(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, candidate_id, original_name, file_size, file_type, skills, technologies,
              experience_years, experience_entries, education, summary,
              ats_score, ats_feedback, created_at
       FROM resumes WHERE candidate_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ resumes: result.rows });
  } catch (err) {
    console.error('List my resumes error:', err);
    return res.status(500).json({ message: 'Server error fetching resumes' });
  }
}

// ---------------------------------------------------------------
// GET /api/resumes/me/latest (candidate) — the most recent resume's
// analysis, used to populate the dashboard's Resume Analysis card.
// ---------------------------------------------------------------
async function getLatestResume(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, candidate_id, original_name, file_size, file_type, skills, technologies,
              experience_years, experience_entries, education, summary,
              ats_score, ats_feedback, created_at
       FROM resumes WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    return res.status(200).json({ resume: result.rows[0] || null });
  } catch (err) {
    console.error('Get latest resume error:', err);
    return res.status(500).json({ message: 'Server error fetching resume' });
  }
}

// ---------------------------------------------------------------
// GET /api/resumes/:id (owner candidate, or coach/recruiter/admin)
// ---------------------------------------------------------------
async function getResumeById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, candidate_id, original_name, file_size, file_type, skills, technologies,
              experience_years, experience_entries, education, summary,
              ats_score, ats_feedback, created_at
       FROM resumes WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    const resume = result.rows[0];
    const isOwner = resume.candidate_id === req.user.id;
    const isStaff = ['coach', 'recruiter', 'admin'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'You do not have access to this resume' });
    }
    return res.status(200).json({ resume });
  } catch (err) {
    console.error('Get resume error:', err);
    return res.status(500).json({ message: 'Server error fetching resume' });
  }
}

// ---------------------------------------------------------------
// GET /api/resumes/:id/file (owner candidate, or staff) — streams
// the original uploaded PDF back for download/preview.
// ---------------------------------------------------------------
async function downloadResumeFile(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM resumes WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    const resume = result.rows[0];
    const isOwner = resume.candidate_id === req.user.id;
    const isStaff = ['coach', 'recruiter', 'admin'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'You do not have access to this resume' });
    }
    if (!fs.existsSync(resume.file_path)) {
      return res.status(404).json({ message: 'Original file no longer available' });
    }
    const ext = path.extname(resume.original_name).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/pdf';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${resume.original_name}"`);
    fs.createReadStream(resume.file_path).pipe(res);
  } catch (err) {
    console.error('Download resume error:', err);
    return res.status(500).json({ message: 'Server error downloading resume' });
  }
}

// ---------------------------------------------------------------
// DELETE /api/resumes/:id (owner candidate only)
// ---------------------------------------------------------------
async function deleteResume(req, res) {
  try {
    const { id } = req.params;
    const candidateId = req.user.id;

    const existing = await pool.query(`SELECT * FROM resumes WHERE id = $1 AND candidate_id = $2`, [id, candidateId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    await pool.query(`DELETE FROM resumes WHERE id = $1`, [id]);
    fs.unlink(existing.rows[0].file_path, () => {});

    return res.status(200).json({ message: 'Resume deleted' });
  } catch (err) {
    console.error('Delete resume error:', err);
    return res.status(500).json({ message: 'Server error deleting resume' });
  }
}

module.exports = {
  uploadMiddleware,
  uploadResume,
  listMyResumes,
  getLatestResume,
  getResumeById,
  downloadResumeFile,
  deleteResume,
};
