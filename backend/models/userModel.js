const { pool } = require('../config/database')

async function findByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  )
  return result.rows[0] || null
}

async function findById(id) {
  const result = await pool.query(
    'SELECT id, name, email, role, provider, avatar, created_at, updated_at FROM users WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

async function create({ name, email, password, role = 'USER', provider = 'LOCAL' }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role, provider)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, provider, avatar, created_at`,
    [name, email, password, role.toUpperCase(), provider.toUpperCase()]
  )
  return result.rows[0]
}

async function updateProfile(id, { name, email }) {
  const result = await pool.query(
    `UPDATE users SET name = $1, email = $2
     WHERE id = $3
     RETURNING id, name, email, role, provider, avatar, created_at, updated_at`,
    [name, email, id]
  )
  return result.rows[0] || null
}

async function updatePassword(id, hashedPassword) {
  await pool.query(
    'UPDATE users SET password = $1 WHERE id = $2',
    [hashedPassword, id]
  )
}

module.exports = { findByEmail, findById, create, updateProfile, updatePassword }
