'use strict'

const path = require('path')
const fs   = require('fs')
const { pool }             = require('../config/database')
const { uploadRecording, recordingDir } = require('../config/multerRecording')

/* ─── POST /api/recordings/upload ───────────────────────────────────────── */
// Called by frontend after interview ends.
// Expects multipart/form-data with:
//   file        – the recording blob
//   interviewId – integer
//   recordingType – 'video' | 'audio'
//   startTime   – ISO string
//   endTime     – ISO string
//   duration    – seconds (integer)
async function uploadRecordingHandler(req, res) {
  try {
    const userId = req.user.id
    const { interviewId, recordingType, startTime, endTime, duration } = req.body

    if (!interviewId) {
      return res.status(400).json({ success: false, message: 'interviewId is required' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No recording file uploaded' })
    }

    // Verify interview belongs to this candidate
    const ivCheck = await pool.query(
      `SELECT id, user_id FROM interviews WHERE id = $1 AND user_id = $2`,
      [interviewId, userId]
    )
    if (!ivCheck.rows[0]) {
      // Clean up orphan file
      try { fs.unlinkSync(req.file.path) } catch (_) {}
      return res.status(403).json({ success: false, message: 'Interview not found or access denied' })
    }

    const type        = recordingType || 'video'
    const filePath    = req.file.path
    const fileName    = req.file.filename
    const mimeType    = req.file.mimetype
    const fileSize    = req.file.size
    const durationSec = parseInt(duration) || 0

    // Idempotent insert: if a recording for this interview+type already exists (retry scenario),
    // update it with the new file and delete the old one from disk.
    const existing = await pool.query(
      `SELECT id, file_path FROM interview_recordings
        WHERE interview_id = $1 AND recording_type = $2`,
      [interviewId, type]
    )

    let recordingId
    if (existing.rows[0]) {
      // Delete old file from disk (best-effort)
      try { if (fs.existsSync(existing.rows[0].file_path)) fs.unlinkSync(existing.rows[0].file_path) } catch (_) {}
      const upd = await pool.query(
        `UPDATE interview_recordings
            SET file_name = $1, file_path = $2, mime_type = $3, file_size = $4,
                start_time = $5, end_time = $6, duration_seconds = $7, created_at = NOW()
          WHERE id = $8
          RETURNING id`,
        [fileName, filePath, mimeType, fileSize, startTime || null, endTime || null, durationSec, existing.rows[0].id]
      )
      recordingId = upd.rows[0].id
      console.log(`[RECORDING] Updated existing record id=${recordingId} (retry/dedup) interview=${interviewId} type=${type}`)
    } else {
      const ins = await pool.query(
        `INSERT INTO interview_recordings
           (user_id, interview_id, recording_type, file_name, file_path,
            mime_type, file_size, start_time, end_time, duration_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [userId, interviewId, type, fileName, filePath, mimeType, fileSize, startTime || null, endTime || null, durationSec]
      )
      recordingId = ins.rows[0].id
      console.log(`[RECORDING] Saved — id=${recordingId} interview=${interviewId} type=${type} size=${fileSize} bytes`)
    }

    return res.status(201).json({
      success: true,
      recordingId,
      fileName,
      recordingType: type,
    })
  } catch (err) {
    console.error('[uploadRecording]', err.message)
    // Clean up disk file on any error — prevents orphaned files
    if (req.file) { try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path) } catch (_) {} }
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── GET /api/recordings/:id/stream ────────────────────────────────────── */
// Protected: candidate own, or RECRUITER/ADMIN.
// Also accepts ?token=<jwt> in query string so <a href> and <video src> work
// without needing custom fetch headers.
async function streamRecording(req, res) {
  try {
    // Accept Bearer header OR ?token= query param (for <video src> / <a href>)
    let userId = req.user?.id
    let role   = req.user?.role

    if (!userId && req.query.token) {
      try {
        const { verifyToken } = require('../utils/jwt')
        const payload = verifyToken(req.query.token)
        userId = payload.id
        role   = payload.role
      } catch (_) {
        return res.status(401).json({ success: false, message: 'Invalid token' })
      }
    }

    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' })

    const { id } = req.params

    const result = await pool.query(
      `SELECT r.*, iv.user_id AS candidate_id
         FROM interview_recordings r
         JOIN interviews iv ON iv.id = r.interview_id
        WHERE r.id = $1`,
      [id]
    )

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Recording not found' })
    }

    const rec = result.rows[0]

    // Authorization check
    const isOwner     = rec.candidate_id === userId
    const isPrivileged = role === 'RECRUITER' || role === 'ADMIN'
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const filePath = rec.file_path
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Recording file not found on disk' })
    }

    const stat = fs.statSync(filePath)
    const mimeType = rec.mime_type || 'video/webm'
    const range    = req.headers.range

    if (range) {
      // Support range requests for video seeking
      const parts  = range.replace(/bytes=/, '').split('-')
      const start  = parseInt(parts[0], 10)
      const end    = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
      const chunkSize = end - start + 1
      const stream = fs.createReadStream(filePath, { start, end })
      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
        'Content-Type':   mimeType,
      })
      stream.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type':   mimeType,
        'Accept-Ranges':  'bytes',
        'Cache-Control':  'no-store',
      })
      fs.createReadStream(filePath).pipe(res)
    }
  } catch (err) {
    console.error('[streamRecording]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── GET /api/recordings/interview/:interviewId ─────────────────────────── */
// List all recordings for an interview (candidate own, or recruiter/admin).
async function listByInterview(req, res) {
  try {
    const userId = req.user.id
    const role   = req.user.role
    const { interviewId } = req.params

    // First verify access: candidate can only see own; RECRUITER and ADMIN can view all
    const isPrivileged = role === 'RECRUITER' || role === 'ADMIN'
    if (!isPrivileged) {
      const check = await pool.query(
        `SELECT id FROM interviews WHERE id = $1 AND user_id = $2`,
        [interviewId, userId]
      )
      if (!check.rows[0]) {
        return res.status(403).json({ success: false, message: 'Access denied' })
      }
    }

    const result = await pool.query(
      `SELECT r.id, r.recording_type, r.file_name, r.mime_type,
              r.file_size, r.duration_seconds, r.start_time, r.end_time, r.created_at
         FROM interview_recordings r
        WHERE r.interview_id = $1
        ORDER BY r.created_at ASC`,
      [interviewId]
    )

    return res.status(200).json({ success: true, recordings: result.rows })
  } catch (err) {
    console.error('[listByInterview]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── GET /api/recordings/results (RECRUITER/ADMIN only) ────────────────── */
// Returns all completed interviews with candidate names, scores, and evaluations.
async function getInterviewResults(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         iv.id               AS interview_id,
         iv.selected_role    AS role,
         iv.interview_type,
         iv.difficulty,
         iv.status,
         iv.score,
         iv.started_at,
         iv.completed_at,
         iv.duration,
         iv.question_count,
         iv.questions_answered,
         iv.overall_feedback,
         iv.hire_recommendation,
         iv.category_scores,
         iv.strengths,
         iv.weaknesses,
         u.id                AS candidate_id,
         u.name              AS candidate_name,
         u.email             AS candidate_email,
         (SELECT COUNT(*) FROM interview_recordings r WHERE r.interview_id = iv.id) AS recording_count,
         (SELECT r.id FROM interview_recordings r WHERE r.interview_id = iv.id ORDER BY r.created_at DESC LIMIT 1) AS recording_id
       FROM interviews iv
       JOIN users u ON u.id = iv.user_id
       WHERE iv.status = 'completed'
       ORDER BY iv.completed_at DESC
       LIMIT 100`
    )

    return res.status(200).json({ success: true, results: result.rows })
  } catch (err) {
    console.error('[getInterviewResults]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── GET /api/recordings/results/:interviewId (RECRUITER/ADMIN only) ────── */
// Per-interview detail: questions + answers + per-question scores + evaluation.
async function getInterviewDetail(req, res) {
  try {
    const { interviewId } = req.params

    const ivResult = await pool.query(
      `SELECT iv.*, u.name AS candidate_name, u.email AS candidate_email
         FROM interviews iv
         JOIN users u ON u.id = iv.user_id
        WHERE iv.id = $1`,
      [interviewId]
    )
    if (!ivResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Interview not found' })
    }

    const iv = ivResult.rows[0]

    const qResult = await pool.query(
      `SELECT iq.id, iq.question, iq.category, iq.difficulty, iq.sequence,
              ia.answer, ia.time_taken, ia.score, ia.feedback
         FROM interview_questions iq
         LEFT JOIN interview_answers ia ON ia.question_id = iq.id
        WHERE iq.interview_id = $1
        ORDER BY iq.sequence`,
      [interviewId]
    )

    const rResult = await pool.query(
      `SELECT id, recording_type, mime_type, file_size, duration_seconds, created_at
         FROM interview_recordings
        WHERE interview_id = $1
        ORDER BY created_at ASC`,
      [interviewId]
    )

    return res.status(200).json({
      success: true,
      interview: {
        id:                 iv.id,
        candidateName:      iv.candidate_name,
        candidateEmail:     iv.candidate_email,
        role:               iv.selected_role,
        interviewType:      iv.interview_type,
        difficulty:         iv.difficulty,
        status:             iv.status,
        score:              iv.score,
        startedAt:          iv.started_at,
        completedAt:        iv.completed_at,
        duration:           iv.duration,
        questionCount:      iv.question_count,
        questionsAnswered:  iv.questions_answered || 0,
        overallFeedback:    iv.overall_feedback,
        strengths:          iv.strengths,
        weaknesses:         iv.weaknesses,
        recommendations:    iv.recommendations,
        categoryScores:     iv.category_scores,
        hireRecommendation: iv.hire_recommendation,
      },
      questions: qResult.rows,
      recordings: rResult.rows,
    })
  } catch (err) {
    console.error('[getInterviewDetail]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = {
  uploadRecordingHandler,
  streamRecording,
  listByInterview,
  getInterviewResults,
  getInterviewDetail,
}
