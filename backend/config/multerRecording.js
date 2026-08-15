'use strict'

const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

const recordingDir = path.join(__dirname, '..', 'uploads', 'recordings')
if (!fs.existsSync(recordingDir)) fs.mkdirSync(recordingDir, { recursive: true })

const ALLOWED_MIME = new Set([
  'video/webm',
  'video/ogg',
  'video/mp4',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordingDir),
  filename: (req, file, cb) => {
    const interviewId = req.body?.interviewId || req.query?.interviewId || 'unknown'
    const type        = req.body?.recordingType || 'video'
    const ext         = path.extname(file.originalname) || mimeToExt(file.mimetype)
    const unique      = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `interview-${interviewId}-${type}-${unique}${ext}`)
  },
})

function mimeToExt(mime) {
  if (!mime) return '.webm'
  if (mime.includes('ogg')) return '.ogg'
  if (mime.includes('mp4')) return '.mp4'
  return '.webm'
}

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported recording MIME type: ${file.mimetype}`))
  }
}

const uploadRecording = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
})

module.exports = { uploadRecording, recordingDir }
