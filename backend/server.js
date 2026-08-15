require('dotenv').config()

const express      = require('express')
const cors         = require('cors')
const helmet       = require('helmet')
const path         = require('path')
const passport     = require('./config/passport')
const authRoutes   = require('./routes/authRoutes')
const resumeRoutes    = require('./routes/resumeRoutes')
const interviewRoutes = require('./routes/interviewRoutes')
const recordingRoutes = require('./routes/recordingRoutes')
const ttsRoutes       = require('./routes/ttsRoutes')
const sttRoutes       = require('./routes/sttRoutes')
const { errorHandler } = require('./middleware/errorHandler')
const { testConnection, initDatabase } = require('./config/database')

const app  = express()
const PORT = process.env.PORT || 5000

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(passport.initialize())

// (Public /uploads static exposure removed for security: all resumes and recordings are protected behind authenticated API endpoints)

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HireAI backend is running' })
})

app.use('/api/auth',       authRoutes)
app.use('/api/resume',     resumeRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/recordings', recordingRoutes)
app.use('/api/interview',  ttsRoutes)
app.use('/api/stt',        sttRoutes)

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

function multerErrorHandler(err, req, res, next) {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    const isRecording = req.originalUrl?.includes('/recordings') || req.path?.includes('/recordings')
    const maxMsg = isRecording ? 'Maximum size is 500 MB.' : 'Maximum size is 5 MB.'
    return res.status(400).json({ success: false, message: `File too large. ${maxMsg}` })
  }
  if (err && err.message && err.message.includes('Only PDF')) {
    return res.status(400).json({ success: false, message: 'Only PDF files are allowed.' })
  }
  next(err)
}

app.use(multerErrorHandler)
app.use(errorHandler)

async function startServer() {
  try {
    await testConnection()
    await initDatabase()
    app.listen(PORT, () => {
      console.log(`HireAI backend running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()