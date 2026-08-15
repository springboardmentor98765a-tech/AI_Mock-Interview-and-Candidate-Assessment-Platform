// backend\controllers\resumeController.js

const fs = require('fs')
const path = require('path')
const { pool } = require('../config/database')
const { parseResume } = require('../services/resumeParser')

async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Please attach a PDF.' })
    }

    const { originalname, filename, path: filePath, size } = req.file
    const userId = req.user.id

    // Use a dedicated client + explicit transaction to guarantee the resume row
    // is committed before the LLM analysis runs. pool.query() can reuse a
    // connection that has an implicit open transaction, causing the row to be
    // invisible to the subsequent resume_analyses INSERT (FK violation).
    const dbClient = await pool.connect()
    let resume
    try {
      await dbClient.query('BEGIN')
      const insertResume = await dbClient.query(
        `INSERT INTO resumes (user_id, filename, original_name, file_path, file_size)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, filename, originalname, filePath, size]
      )
      resume = insertResume.rows[0]
      await dbClient.query('COMMIT')
    } catch (insertErr) {
      await dbClient.query('ROLLBACK').catch(() => {})
      throw insertErr
    } finally {
      dbClient.release()
    }


    let parsed
    try {
      parsed = await parseResume(filePath)
    } catch (parseErr) {
      parsed = {
        rawText: '',
        contact: { name: 'Not detected', email: null, phone: null, location: null, linkedin: null, github: null },
        skills: [],
        technologies: [],
        experience: { entries: [], totalYears: 0, rawDurations: [] },
        education: [],
        summary: 'Could not extract information from this PDF.',
      }
    }

    const insertAnalysis = await pool.query(
      `INSERT INTO resume_analyses
         (resume_id, contact_info, skills, technologies, experience, education, summary, raw_text, ats_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        resume.id,
        JSON.stringify(parsed.contact),
        JSON.stringify(parsed.skills),
        JSON.stringify(parsed.technologies),
        JSON.stringify(parsed.experience),
        JSON.stringify(parsed.education),
        parsed.summary,
        parsed.rawText.slice(0, 10000),
        JSON.stringify(parsed.atsScore || null),
      ]
    )
    const analysis = insertAnalysis.rows[0]

    return res.status(201).json({
      success: true,
      message: 'Resume uploaded and analysed successfully',
      resume: {
        id:           resume.id,
        originalName: resume.original_name,
        fileSize:     resume.file_size,
        uploadDate:   resume.upload_date,
      },
      analysis: {
        id:              analysis.id,
        contact:         parsed.contact,
        skills:          parsed.skills,
        technologies:    parsed.technologies,
        experience:      parsed.experience,
        education:       parsed.education,
        summary:         parsed.summary,
        projects:        parsed.experience?.projects        || [],
        certifications:  parsed.experience?.certifications  || [],
        atsScore:        parsed.atsScore                    || null,
        analyzedAt:      analysis.analyzed_at,
      },
    })
  } catch (err) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path) } catch (_) {}
    }
    next(err)
  }
}

async function getHistory(req, res, next) {
  try {
    const userId = req.user.id
    const result = await pool.query(
      `SELECT r.id, r.original_name, r.file_size, r.upload_date,
              a.id AS analysis_id, a.contact_info, a.skills,
              a.technologies, a.summary, a.ats_score, a.analyzed_at
         FROM resumes r
         LEFT JOIN resume_analyses a ON a.resume_id = r.id
        WHERE r.user_id = $1
        ORDER BY r.upload_date DESC`,
      [userId]
    )
    const resumes = result.rows.map(row => ({
      id:           row.id,
      originalName: row.original_name,
      fileSize:     row.file_size,
      uploadDate:   row.upload_date,
      analysis: row.analysis_id ? {
        id:           row.analysis_id,
        contact:      row.contact_info,
        skills:       row.skills,
        technologies: row.technologies,
        summary:      row.summary,
        atsScore:     row.ats_score || null,
        analyzedAt:   row.analyzed_at,
      } : null,
    }))
    return res.status(200).json({ success: true, resumes })
  } catch (err) {
    next(err)
  }
}

async function getById(req, res, next) {
  try {
    const userId   = req.user.id
    const resumeId = parseInt(req.params.id)

    const result = await pool.query(
      `SELECT r.id, r.original_name, r.file_size, r.upload_date,
              a.id AS analysis_id, a.contact_info, a.skills, a.technologies,
              a.experience, a.education, a.summary, a.ats_score, a.analyzed_at
         FROM resumes r
         LEFT JOIN resume_analyses a ON a.resume_id = r.id
        WHERE r.id = $1 AND r.user_id = $2`,
      [resumeId, userId]
    )

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Resume not found' })
    }

    const row = result.rows[0]
    return res.status(200).json({
      success: true,
      resume: {
        id:           row.id,
        originalName: row.original_name,
        fileSize:     row.file_size,
        uploadDate:   row.upload_date,
      },
      analysis: row.analysis_id ? {
        id:             row.analysis_id,
        contact:        row.contact_info,
        skills:         row.skills,
        technologies:   row.technologies,
        experience:     row.experience,
        education:      row.education,
        summary:        row.summary,
        projects:       (row.experience && row.experience.projects)       || [],
        certifications: (row.experience && row.experience.certifications) || [],
        atsScore:       row.ats_score || null,
        analyzedAt:     row.analyzed_at,
      } : null,
    })
  } catch (err) {
    next(err)
  }
}

async function deleteResume(req, res, next) {
  try {
    const userId   = req.user.id
    const resumeId = parseInt(req.params.id)

    const check = await pool.query(
      'SELECT id, file_path FROM resumes WHERE id = $1 AND user_id = $2',
      [resumeId, userId]
    )
    if (!check.rows[0]) {
      return res.status(404).json({ success: false, message: 'Resume not found' })
    }

    const filePath = check.rows[0].file_path
    await pool.query('DELETE FROM resume_analyses WHERE resume_id = $1', [resumeId])
    await pool.query('DELETE FROM resumes WHERE id = $1', [resumeId])

    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath) } catch (_) {}
    }

    return res.status(200).json({ success: true, message: 'Resume deleted successfully' })
  } catch (err) {
    next(err)
  }
}

async function downloadResume(req, res, next) {
  try {
    const userId   = req.user.id
    const role     = req.user.role
    const resumeId = parseInt(req.params.id)

    const isPrivileged = role === 'RECRUITER' || role === 'ADMIN'

    const check = await pool.query(
      isPrivileged
        ? 'SELECT id, original_name, file_path FROM resumes WHERE id = $1'
        : 'SELECT id, original_name, file_path FROM resumes WHERE id = $1 AND user_id = $2',
      isPrivileged ? [resumeId] : [resumeId, userId]
    )

    if (!check.rows[0]) {
      return res.status(404).json({ success: false, message: 'Resume not found' })
    }

    const { file_path: filePath, original_name: originalName } = check.rows[0]
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Resume file not found on disk' })
    }

    return res.download(filePath, originalName)
  } catch (err) {
    next(err)
  }
}

module.exports = { upload, getHistory, getById, deleteResume, downloadResume }
