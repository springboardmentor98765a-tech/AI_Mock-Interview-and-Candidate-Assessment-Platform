const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
const { notify } = require('../utils/notify');
require('dotenv').config();

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] && profile.emails[0].value;
          const fullName = profile.displayName || 'Google User';
          const providerId = profile.id;

          if (!email) {
            return done(new Error('Google account has no public email'), null);
          }

          // Role is passed through the OAuth "state" param from the frontend
          // (defaults to "candidate" if not supplied — admins are never
          // created this way, see routes/authRoutes.js).
          const requestedRole =
            req.query.state && ['candidate', 'recruiter', 'coach'].includes(req.query.state)
              ? req.query.state
              : 'candidate';

          // 1. Does a user already exist with this Google id?
          let result = await pool.query(
            'SELECT * FROM users WHERE auth_provider = $1 AND provider_id = $2',
            ['google', providerId]
          );

          if (result.rows.length > 0) {
            return done(null, result.rows[0]);
          }

          // 2. Does a local account already exist with this email?
          //    Link the Google identity to it instead of creating a duplicate.
          result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

          if (result.rows.length > 0) {
            const updated = await pool.query(
              `UPDATE users
               SET provider_id = $1, auth_provider = 'google'
               WHERE email = $2
               RETURNING *`,
              [providerId, email]
            );
            return done(null, updated.rows[0]);
          }

          // 3. Brand-new user via Google
          const inserted = await pool.query(
            `INSERT INTO users (full_name, email, password, role, auth_provider, provider_id)
             VALUES ($1, $2, NULL, $3, 'google', $4)
             RETURNING *`,
            [fullName, email, requestedRole, providerId]
          );

          await notify({
            role: 'admin',
            title: 'New User Joined',
            message: `${inserted.rows[0].full_name} (${inserted.rows[0].email}) just signed up as a ${inserted.rows[0].role} via Google.`,
          });
          if (inserted.rows[0].role === 'candidate') {
            await notify({
              role: 'recruiter',
              title: 'New Candidate Joined',
              message: `${inserted.rows[0].full_name} (${inserted.rows[0].email}) just registered as a candidate via Google.`,
            });
            await notify({
              role: 'coach',
              title: 'New Candidate Joined',
              message: `${inserted.rows[0].full_name} (${inserted.rows[0].email}) just registered as a candidate via Google.`,
            });
          }

          return done(null, inserted.rows[0]);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('Google OAuth credentials not configured. Google login will be unavailable until they are set.');
}

// Not using persistent sessions (JWT is stateless), but Passport
// requires these if session middleware is ever enabled.
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
