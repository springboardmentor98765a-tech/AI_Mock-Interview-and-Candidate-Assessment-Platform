const pool = require('../db');

class User {
  // Create new user
  static async create({ name, email, password, role = 'USER', provider = 'LOCAL' }) {
    try {
      console.log('📝 Creating user in database...');
      console.log('📝 User data:', { name, email, role, provider });
      
      const result = await pool.query(
        `INSERT INTO users (name, email, password, role, provider) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, name, email, role, provider, created_at`,
        [name, email, password, role, provider]
      );
      
      console.log('✅ User created in database:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating user:', error);
      console.error('❌ Error details:', error.message);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      console.log('🔍 Finding user by email:', email);
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      console.log('🔍 User found:', result.rows[0] || 'None');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding user:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      console.log('🔍 Finding user by ID:', id);
      const result = await pool.query(
        'SELECT id, name, email, role, provider, created_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding user by ID:', error);
      throw error;
    }
  }

  // Update user
  static async update(id, data) {
    try {
      console.log('🔄 Updating user ID:', id, 'with data:', data);
      
      const fields = [];
      const values = [];
      let index = 1;

      if (data.name !== undefined) {
        fields.push(`name = $${index++}`);
        values.push(data.name);
      }
      if (data.email !== undefined) {
        fields.push(`email = $${index++}`);
        values.push(data.email);
      }
      if (data.role !== undefined) {
        fields.push(`role = $${index++}`);
        values.push(data.role);
      }

      if (fields.length === 0) {
        console.log('⚠️ No fields to update, fetching existing user');
        const result = await pool.query('SELECT id, name, email, role, provider FROM users WHERE id = $1', [id]);
        return result.rows[0];
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      values.push(id);
      const query = `
        UPDATE users 
        SET ${fields.join(', ')} 
        WHERE id = $${index} 
        RETURNING id, name, email, role, provider, created_at, updated_at
      `;
      
      console.log('📝 Update query:', query);
      console.log('📝 Values:', values);
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        console.log('⚠️ No user found with ID:', id);
        return null;
      }
      
      console.log('✅ User updated successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }
}

module.exports = User;