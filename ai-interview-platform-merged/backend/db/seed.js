/**
 * Run once after creating the schema:
 *   node db/seed.js
 * Creates the default admin account referenced on login.html
 * (admin@gmail.com / admin123) with a properly hashed password.
 */
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const email = 'admin@gmail.com';
  const plainPassword = 'admin123';

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.log('Default admin already exists — skipping.');
    return process.exit(0);
  }

  const hashed = await bcrypt.hash(plainPassword, 10);
  await pool.query(
    `INSERT INTO users (full_name, email, password, role, auth_provider)
     VALUES ($1, $2, $3, 'admin', 'local')`,
    ['System Admin', email, hashed]
  );

  console.log('Default admin created: admin@gmail.com / admin123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
