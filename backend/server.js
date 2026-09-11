require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const interviewRoutes = require('./routes/interviews');
const scoringRoutes = require('./routes/scoring');
const recordingRoutes = require('./routes/recordings');
const recruiterRoutes = require('./routes/recruiter');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const recruiterAnalyticsRoutes = require('./routes/recruiter-analytics');
const adminRoutes = require('./routes/admin');


const app = express();
const PORT = process.env.PORT || 5001;

// =============================================
// MIDDLEWARE - CORS MUST BE FIRST!
// =============================================
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.options('*', cors());
app.use(express.json());

// =============================================
// ROUTES
// =============================================
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recruiter-analytics', recruiterAnalyticsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// =============================================
// START SERVER
// =============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
  console.log(`🔑 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set'}`);
});