require('dotenv').config()

const express     = require('express')
const cors        = require('cors')
const helmet      = require('helmet')
const rateLimit   = require('express-rate-limit')
const passport    = require('./config/passport')
const authRoutes  = require('./routes/authRoutes')
const { errorHandler } = require('./middleware/errorHandler')
const { testConnection, initDatabase } = require('./config/database')

const app  = express()
const PORT = process.env.PORT || 5000

app.use(helmet())

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many authentication attempts.' },
})

app.use(globalLimiter)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(passport.initialize())

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HireAI backend is running' })
})

app.use('/api/auth', authLimiter, authRoutes)

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

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
