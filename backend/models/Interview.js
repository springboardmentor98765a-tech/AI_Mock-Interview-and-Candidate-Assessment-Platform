const pool = require('../db');

class Interview {
  // Create a new interview session
  static async create({ user_id, interview_type, domain, difficulty, questions }) {
    try {
      const result = await pool.query(
        `INSERT INTO interviews (user_id, interview_type, domain, difficulty, questions, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
         RETURNING *`,
        [user_id, interview_type, domain, difficulty, JSON.stringify(questions)]
      );
      console.log('✅ Interview created:', result.rows[0].id);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating interview:', error);
      throw error;
    }
  }

  // Get all interviews for a user
  static async findByUserId(user_id) {
    try {
      const result = await pool.query(
        `SELECT * FROM interviews WHERE user_id = $1 ORDER BY created_at DESC`,
        [user_id]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error finding interviews:', error);
      throw error;
    }
  }

  // Get interview by ID
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM interviews WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding interview:', error);
      throw error;
    }
  }

  // Update interview status with timestamps
  static async updateStatus(id, status) {
    try {
      let query = `
        UPDATE interviews 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
      `;
      const params = [status, id];
      
      if (status === 'in_progress') {
        query = `
          UPDATE interviews 
          SET status = $1, 
              start_time = COALESCE(start_time, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
      }
      else if (status === 'completed' || status === 'ended') {
        query = `
          UPDATE interviews 
          SET status = $1, 
              end_time = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
      }
      else if (status === 'paused') {
        query = `
          UPDATE interviews 
          SET status = $1, 
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
          RETURNING *
        `;
      }
      
      const result = await pool.query(query, params);
      console.log(`✅ Interview ${id} status updated to: ${status}`);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating interview status:', error);
      throw error;
    }
  }

  // =============================================
  // UPDATE SCORE AND FEEDBACK - WITH SUBMISSION TYPE
  // =============================================
  static async updateScoreAndFeedback(id, score, feedback, submissionType = 'full', speechAnalysis = null) {
  try {
    const numericScore = parseFloat(score) || 0;
    
    const result = await pool.query(
      `UPDATE interviews 
       SET score = $1, 
           feedback = $2, 
           status = 'completed', 
           submission_type = $3,
           speech_analysis = $4,  -- ✅ Must have this column
           end_time = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING *`,
      [numericScore, feedback, submissionType, speechAnalysis ? JSON.stringify(speechAnalysis) : null, id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating interview:', error);
    throw error;
  }
}

  // Pause interview session
  static async pauseInterview(id) {
    try {
      const result = await pool.query(
        `UPDATE interviews 
         SET status = 'paused', 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      console.log(`⏸️ Interview ${id} paused`);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error pausing interview:', error);
      throw error;
    }
  }

  // Resume interview session
  static async resumeInterview(id) {
    try {
      const result = await pool.query(
        `UPDATE interviews 
         SET status = 'in_progress', 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      console.log(`▶️ Interview ${id} resumed`);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error resuming interview:', error);
      throw error;
    }
  }

  // Delete interview
  static async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM interviews WHERE id = $1 RETURNING *',
        [id]
      );
      console.log(`🗑️ Interview ${id} deleted`);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error deleting interview:', error);
      throw error;
    }
  }

  // Get active session for user
  static async getActiveSession(user_id) {
    try {
      const result = await pool.query(
        `SELECT * FROM interviews 
         WHERE user_id = $1 
         AND status IN ('pending', 'in_progress', 'paused')
         ORDER BY created_at DESC 
         LIMIT 1`,
        [user_id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting active session:', error);
      throw error;
    }
  }

  // Get session stats for user
  static async getSessionStats(user_id) {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_sessions,
          COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_sessions,
          AVG(score) as average_score,
          MAX(score) as highest_score,
          MIN(score) as lowest_score,
          SUM(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (end_time - start_time)) ELSE 0 END) as total_time_spent
         FROM interviews 
         WHERE user_id = $1`,
        [user_id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting session stats:', error);
      throw error;
    }
  }

  // Get interviews by type and domain
  static async findByTypeAndDomain(user_id, interview_type, domain) {
    try {
      const result = await pool.query(
        `SELECT * FROM interviews 
         WHERE user_id = $1 
         AND interview_type = $2 
         AND domain = $3 
         ORDER BY created_at DESC`,
        [user_id, interview_type, domain]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error finding interviews by type and domain:', error);
      throw error;
    }
  }

  // =============================================
  // DETAILED SCORING METHODS
  // =============================================

  /**
   * Store detailed score breakdown
   */
  static async updateDetailedScores(id, scoreBreakdown) {
    try {
      const result = await pool.query(
        `UPDATE interviews 
         SET communication_score = $1,
             confidence_score = $2,
             technical_score = $3,
             professionalism_score = $4,
             score_breakdown = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 
         RETURNING *`,
        [
          scoreBreakdown.communication || 0,
          scoreBreakdown.confidence || 0,
          scoreBreakdown.technical || 0,
          scoreBreakdown.professionalism || 0,
          JSON.stringify(scoreBreakdown),
          id
        ]
      );
      console.log('✅ Detailed scores updated for interview:', id);
      return result.rows[0];
    } catch (error) {
      // Column might not exist yet, gracefully handle
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.warn('⚠️  Score columns not yet in database. This is OK - scores will be stored in feedback JSON');
        return null;
      }
      console.error('❌ Error updating detailed scores:', error);
      throw error;
    }
  }

  /**
   * Get interview with detailed scoring information
   */
  static async findByIdWithScores(id) {
    try {
      const result = await pool.query(
        `SELECT * FROM interviews WHERE id = $1`,
        [id]
      );
      
      if (result.rows[0]) {
        const interview = result.rows[0];
        
        // Parse feedback if it contains scoring data
        if (interview.feedback) {
          try {
            interview.feedbackData = JSON.parse(interview.feedback);
          } catch (e) {
            interview.feedbackData = null;
          }
        }
        
        return interview;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error finding interview with scores:', error);
      throw error;
    }
  }

  /**
   * Store AI-generated feedback and performance report
   */
  static async updateAIFeedback(id, feedbackData) {
    try {
      const result = await pool.query(
        `UPDATE interviews 
         SET feedback = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 
         RETURNING *`,
        [JSON.stringify(feedbackData), id]
      );
      console.log('✅ AI feedback updated for interview:', id);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating AI feedback:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for user
   */
  static async getUserPerformanceMetrics(user_id) {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total_interviews,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_interviews,
          AVG(score) as average_score,
          MAX(score) as highest_score,
          MIN(score) as lowest_score,
          COUNT(CASE WHEN score >= 90 THEN 1 END) as excellent_count,
          COUNT(CASE WHEN score >= 75 AND score < 90 THEN 1 END) as good_count,
          COUNT(CASE WHEN score >= 60 AND score < 75 THEN 1 END) as average_count,
          COUNT(CASE WHEN score >= 40 AND score < 60 THEN 1 END) as needs_improvement_count,
          COUNT(CASE WHEN score < 40 THEN 1 END) as poor_count
         FROM interviews 
         WHERE user_id = $1 AND status = 'completed'`,
        [user_id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get interview score history for trending
   */
  static async getScoreHistory(user_id, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          interview_type,
          domain,
          score,
          created_at,
          status
         FROM interviews 
         WHERE user_id = $1 AND status = 'completed'
         ORDER BY created_at DESC
         LIMIT $2`,
        [user_id, limit]
      );
      return result.rows.reverse(); // Return in ascending order for trending
    } catch (error) {
      console.error('❌ Error getting score history:', error);
      throw error;
    }
  }
}

module.exports = Interview;