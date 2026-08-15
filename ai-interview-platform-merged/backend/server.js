const express = require('express');
const cors = require('cors');
const path = require('path');
const passport = require('./config/passport');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const jobRoutes = require('./routes/jobRoutes');
const adminRoutes = require('./routes/adminRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const { applySchemaPatches } = require('./utils/schemaPatches');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5500' }));
app.use(express.json());
app.use(passport.initialize());

// Publicly served avatar images — not sensitive, and <img> tags can't
// attach an Authorization header, unlike the authenticated resume
// download route.
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads', 'avatars')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error' });
});

const PORT = process.env.PORT || 5000;
applySchemaPatches().finally(() => {
  app.listen(PORT, () => {
    console.log(`AI Interview Platform API running on http://localhost:${PORT}`);
  });
});
