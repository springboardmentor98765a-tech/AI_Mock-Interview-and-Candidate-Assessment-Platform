const passport       = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const GitHubStrategy = require('passport-github2').Strategy
const { pool }       = require('./database')
require('dotenv').config()

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email  = profile.emails[0].value
        const name   = profile.displayName
        const avatar = profile.photos[0]?.value || null

        const existing = await pool.query(
          'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
          [email]
        )

        if (existing.rows.length > 0) {
          const user = existing.rows[0]

          await pool.query(
            'UPDATE users SET provider = $1, google_id = $2, avatar = $3 WHERE id = $4',
            ['GOOGLE', profile.id, avatar, user.id]
          )

          const updated = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [user.id]
          )
          return done(null, updated.rows[0])
        }

        const result = await pool.query(
          `INSERT INTO users (name, email, provider, google_id, avatar, role)
           VALUES ($1, $2, 'GOOGLE', $3, $4, 'USER')
           RETURNING *`,
          [name, email, profile.id, avatar]
        )

        return done(null, result.rows[0])
      } catch (err) {
        return done(err, null)
      }
    }
  )
)

passport.use(
  new GitHubStrategy(
    {
      clientID:     process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL:  process.env.GITHUB_CALLBACK_URL,
      scope:        ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const emailEntry = (profile.emails || []).find(e => e.value) || {}
        const email      = emailEntry.value || null
        const name       = profile.displayName || profile.username || 'GitHub User'
        const avatar     = profile.photos[0]?.value || null

        if (!email) {
          return done(new Error('GitHub account does not have a public email. Please set a public email on GitHub and try again.'), null)
        }

        const existing = await pool.query(
          'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
          [email]
        )

        if (existing.rows.length > 0) {
          const user = existing.rows[0]

          await pool.query(
            'UPDATE users SET provider = $1, github_id = $2, avatar = $3 WHERE id = $4',
            ['GITHUB', profile.id, avatar, user.id]
          )

          const updated = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [user.id]
          )
          return done(null, updated.rows[0])
        }

        const result = await pool.query(
          `INSERT INTO users (name, email, provider, github_id, avatar, role)
           VALUES ($1, $2, 'GITHUB', $3, $4, 'USER')
           RETURNING *`,
          [name, email, profile.id, avatar]
        )

        return done(null, result.rows[0])
      } catch (err) {
        return done(err, null)
      }
    }
  )
)

passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, provider, avatar, created_at, updated_at FROM users WHERE id = $1',
      [id]
    )
    done(null, result.rows[0] || null)
  } catch (err) {
    done(err, null)
  }
})

module.exports = passport
