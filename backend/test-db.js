const pool = require('./db');
const User = require('./models/User');

async function testDB() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test 1: Simple query
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database time:', result.rows[0].now);
    
    // Test 2: Check users table
    const users = await pool.query('SELECT * FROM users');
    console.log('📊 Current users:', users.rows);
    console.log('📊 User count:', users.rows.length);
    
    // Test 3: Try to create a test user
    console.log('\n📝 Creating test user...');
    const testUser = await User.create({
      name: 'Test DB User',
      email: 'testdb@example.com',
      password: null,
      role: 'USER',
      provider: 'GOOGLE'
    });
    console.log('✅ Test user created:', testUser);
    
    // Test 4: Find the test user
    const foundUser = await User.findByEmail('testdb@example.com');
    console.log('🔍 Found user:', foundUser);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDB();