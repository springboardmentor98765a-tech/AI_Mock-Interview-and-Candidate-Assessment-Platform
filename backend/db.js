const { Pool } = require('pg');
require('dotenv').config();

console.log('🔌 Database Configuration:');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);
console.log('Password:', process.env.DB_PASSWORD ? '****' : 'Not set');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('Please check:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database name is correct:', process.env.DB_NAME);
    console.error('3. Password is correct');
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

module.exports = pool;