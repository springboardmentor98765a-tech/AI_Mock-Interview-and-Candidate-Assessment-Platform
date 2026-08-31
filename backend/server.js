require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const interviewRoutes = require('./routes/interviews');


const app = express();
const PORT = process.env.PORT || 5001;

const recordingRoutes = require('./routes/recordings');



// =============================================
// MIDDLEWARE
// =============================================
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());

// =============================================
// ROUTES
// =============================================
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/interviews', interviewRoutes);


// Add this after other route declarations
app.use('/api/recordings', recordingRoutes);

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
  console.log(`📝 Google Callback: http://localhost:${PORT}/api/oauth/google/callback`);
});