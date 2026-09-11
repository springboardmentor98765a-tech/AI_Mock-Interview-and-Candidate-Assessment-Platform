const pool = require('../db');

class Recording {
  // Create a new recording record
  static async create({ interview_id, user_id, file_path, file_name, file_size, duration }) {
    try {
      const result = await pool.query(
        `INSERT INTO recordings (interview_id, user_id, file_path, file_name, file_size, duration, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING *`,
        [interview_id, user_id, file_path, file_name, file_size, duration]
      );
      console.log('✅ Recording record created:', result.rows[0].id);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating recording:', error);
      throw error;
    }
  }

  // Get all recordings for a user
  static async findByUserId(user_id) {
    try {
      const result = await pool.query(
        `SELECT r.*, i.interview_type, i.domain, i.difficulty 
         FROM recordings r
         JOIN interviews i ON r.interview_id = i.id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC`,
        [user_id]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error finding recordings by user:', error);
      throw error;
    }
  }

  // Get recording by ID
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM recordings WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding recording:', error);
      throw error;
    }
  }

  // Get recordings for a specific interview
  static async findByInterviewId(interview_id) {
    try {
      const result = await pool.query(
        'SELECT * FROM recordings WHERE interview_id = $1 ORDER BY created_at DESC',
        [interview_id]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error finding recordings by interview:', error);
      throw error;
    }
  }

  // Delete recording
  static async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM recordings WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error deleting recording:', error);
      throw error;
    }
  }
}

module.exports = Recording;