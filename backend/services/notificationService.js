// backend/services/notificationService.js
const nodemailer = require('nodemailer');
const pool = require('../db');

class NotificationService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // =============================================
  // 1. SEND INTERVIEW REMINDER
  // =============================================
  async sendInterviewReminder(userId, interviewId, hoursBefore = 24) {
    try {
      // Get user and interview data
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [userId]
      );
      const interviewResult = await pool.query(
        'SELECT * FROM interviews WHERE id = $1',
        [interviewId]
      );

      if (userResult.rows.length === 0 || interviewResult.rows.length === 0) {
        return { success: false, error: 'User or interview not found' };
      }

      const user = userResult.rows[0];
      const interview = interviewResult.rows[0];

      // Check if reminder was already sent
      const reminderCheck = await pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 AND interview_id = $2 AND type = $3',
        [userId, interviewId, 'interview_reminder']
      );

      if (reminderCheck.rows.length > 0) {
        return { success: false, error: 'Reminder already sent' };
      }

      // Generate email content
      const emailContent = this._generateReminderEmail(user, interview, hoursBefore);

      // Send email
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@smarthire.ai',
        to: user.email,
        subject: `🗓️ Interview Reminder - ${hoursBefore} Hours Left!`,
        html: emailContent
      });

      // Log notification
      await pool.query(
        `INSERT INTO notifications (user_id, interview_id, type, subject, sent_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [userId, interviewId, 'interview_reminder', `Reminder ${hoursBefore}h before interview`]
      );

      console.log(`📧 Reminder sent to ${user.email}`);
      return { success: true, message: 'Reminder sent successfully' };

    } catch (error) {
      console.error('Error sending reminder:', error);
      return { success: false, error: error.message };
    }
  }

  // =============================================
  // 2. SEND PERFORMANCE REPORT
  // =============================================
  async sendPerformanceReport(userId, interviewId) {
    try {
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [userId]
      );
      const interviewResult = await pool.query(
        'SELECT * FROM interviews WHERE id = $1',
        [interviewId]
      );

      if (userResult.rows.length === 0 || interviewResult.rows.length === 0) {
        return { success: false, error: 'User or interview not found' };
      }

      const user = userResult.rows[0];
      const interview = interviewResult.rows[0];

      // Generate report data
      const reportData = this._generateReportData(interview);
      
      // Generate email content
      const emailContent = this._generateReportEmail(user, reportData);

      // Send email
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@smarthire.ai',
        to: user.email,
        subject: '📊 Your Interview Performance Report',
        html: emailContent
      });

      // Log notification
      await pool.query(
        `INSERT INTO notifications (user_id, interview_id, type, subject, sent_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [userId, interviewId, 'performance_report', 'Interview Performance Report']
      );

      console.log(`📧 Performance report sent to ${user.email}`);
      return { success: true, message: 'Report sent successfully' };

    } catch (error) {
      console.error('Error sending report:', error);
      return { success: false, error: error.message };
    }
  }

  // =============================================
  // 3. SEND SESSION ALERT
  // =============================================
  async sendSessionAlert(userId, interviewId, action, details = {}) {
    try {
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [userId]
      );
      const interviewResult = await pool.query(
        'SELECT * FROM interviews WHERE id = $1',
        [interviewId]
      );

      if (userResult.rows.length === 0 || interviewResult.rows.length === 0) {
        return { success: false, error: 'User or interview not found' };
      }

      const user = userResult.rows[0];
      const interview = interviewResult.rows[0];

      const alertTypes = {
        started: {
          subject: '▶️ Interview Session Started',
          emoji: '🎬'
        },
        paused: {
          subject: '⏸️ Interview Session Paused',
          emoji: '⏸️'
        },
        resumed: {
          subject: '▶️ Interview Session Resumed',
          emoji: '▶️'
        },
        ended: {
          subject: '⏹️ Interview Session Ended',
          emoji: '⏹️'
        },
        completed: {
          subject: '✅ Interview Session Completed',
          emoji: '🎉'
        }
      };

      const alert = alertTypes[action] || alertTypes.started;

      // Generate email content
      const emailContent = this._generateSessionAlertEmail(
        user, 
        interview, 
        action, 
        alert,
        details
      );

      // Send email
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@smarthire.ai',
        to: user.email,
        subject: `${alert.emoji} ${alert.subject}`,
        html: emailContent
      });

      // Log notification
      await pool.query(
        `INSERT INTO notifications (user_id, interview_id, type, subject, sent_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [userId, interviewId, `session_${action}`, alert.subject]
      );

      console.log(`📧 Session alert sent to ${user.email}: ${action}`);
      return { success: true, message: 'Session alert sent' };

    } catch (error) {
      console.error('Error sending session alert:', error);
      return { success: false, error: error.message };
    }
  }

  // =============================================
  // 4. GENERATE PERFORMANCE SUMMARY
  // =============================================
  async generatePerformanceSummary(userId, timeRange = 'all') {
    try {
      let query = `
        SELECT * FROM interviews 
        WHERE user_id = $1 AND status = 'completed'
      `;
      const params = [userId];

      if (timeRange === '30d') {
        query += ` AND created_at >= NOW() - INTERVAL '30 days'`;
      } else if (timeRange === '90d') {
        query += ` AND created_at >= NOW() - INTERVAL '90 days'`;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, params);
      const interviews = result.rows;

      if (interviews.length === 0) {
        return {
          success: true,
          data: {
            message: 'No completed interviews found',
            totalInterviews: 0,
            averageScore: 0
          }
        };
      }

      // Calculate statistics
      const scores = interviews.map(i => i.score || 0).filter(s => s > 0);
      const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0;
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      // Get skill breakdown
      const skillBreakdown = this._getSkillBreakdown(interviews);

      // Generate summary
      const summary = {
        totalInterviews: interviews.length,
        averageScore: avgScore,
        highestScore: highestScore,
        lowestScore: lowestScore,
        skillBreakdown: skillBreakdown,
        performanceRating: this._getPerformanceRating(avgScore),
        recommendations: this._getRecommendations(avgScore, skillBreakdown)
      };

      return {
        success: true,
        data: summary
      };

    } catch (error) {
      console.error('Error generating summary:', error);
      return { success: false, error: error.message };
    }
  }

  // =============================================
  // 5. GET NOTIFICATION HISTORY
  // =============================================
  async getNotificationHistory(userId, limit = 20) {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         ORDER BY sent_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // =============================================
  // 6. MARK NOTIFICATION AS READ
  // =============================================
  async markAsRead(notificationId, userId) {
    try {
      const result = await pool.query(
        `UPDATE notifications 
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Notification not found' };
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  _generateReminderEmail(user, interview, hoursBefore) {
    const typeLabels = {
      tr: 'Technical Round',
      mr: 'Managerial Round',
      hr: 'HR Round'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4f46e5, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px; }
          .highlight { font-weight: bold; color: #4f46e5; }
          .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #4f46e5, #3b82f6); color: white; text-decoration: none; border-radius: 8px; margin: 10px 0; }
          .details { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #4f46e5; }
          .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗓️ Interview Reminder</h1>
            <p style="margin: 0; opacity: 0.9;">Your interview starts in ${hoursBefore} hours</p>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p>This is a reminder that you have an upcoming interview session on <span class="highlight">SmartHire AI</span>.</p>
            
            <div class="details">
              <h3 style="margin: 0 0 12px 0;">📋 Interview Details</h3>
              <p><strong>Round:</strong> ${typeLabels[interview.interview_type] || interview.interview_type}</p>
              <p><strong>Domain:</strong> ${interview.domain}</p>
              <p><strong>Difficulty:</strong> ${interview.difficulty}</p>
              <p><strong>Questions:</strong> ${interview.questions?.length || 0}</p>
              <p><strong>Created:</strong> ${new Date(interview.created_at).toLocaleString()}</p>
            </div>
            
            <p style="text-align: center;">
              <a href="http://localhost:3001/interview/${interview.id}" class="btn">🎯 Start Your Interview</a>
            </p>
            
            <div style="background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0; color: #92400e;">💡 <strong>Tip:</strong> Make sure you have a stable internet connection, a working microphone, and a quiet environment.</p>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 SmartHire AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  _generateReportEmail(user, reportData) {
    const ratingEmoji = {
      Excellent: '🌟',
      Good: '👍',
      Average: '📈',
      'Needs Improvement': '🔄',
      Poor: '⚠️'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4f46e5, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px; }
          .score-box { background: white; padding: 20px; border-radius: 12px; text-align: center; margin: 16px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          .score-number { font-size: 48px; font-weight: 700; color: #4f46e5; }
          .section { background: white; padding: 16px; border-radius: 8px; margin: 12px 0; border-left: 4px solid #4f46e5; }
          .section.green { border-left-color: #22c55e; }
          .section.red { border-left-color: #ef4444; }
          .section.orange { border-left-color: #f59e0b; }
          .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Interview Performance Report</h1>
            <p style="margin: 0; opacity: 0.9;">${ratingEmoji[reportData.performanceRating] || '📊'} ${reportData.performanceRating}</p>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p>Your interview performance report is ready. Here's a comprehensive summary:</p>
            
            <div class="score-box">
              <div class="score-number">${reportData.overallScore}%</div>
              <div class="score-label">Overall Performance Score</div>
            </div>
            
            <div class="section">
              <h3 style="margin: 0 0 12px 0;">📈 Performance Breakdown</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0;"><strong>Communication</strong></td><td style="padding: 6px 0; text-align: right;">${reportData.communication}%</td></tr>
                <tr><td style="padding: 6px 0;"><strong>Confidence</strong></td><td style="padding: 6px 0; text-align: right;">${reportData.confidence}%</td></tr>
                <tr><td style="padding: 6px 0;"><strong>Technical</strong></td><td style="padding: 6px 0; text-align: right;">${reportData.technical}%</td></tr>
                <tr><td style="padding: 6px 0;"><strong>Professionalism</strong></td><td style="padding: 6px 0; text-align: right;">${reportData.professionalism}%</td></tr>
              </table>
            </div>
            
            <div class="section green">
              <h3>💪 Strengths</h3>
              <ul>${reportData.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
            
            <div class="section red">
              <h3>📈 Areas for Improvement</h3>
              <ul>${reportData.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="http://localhost:3001/report/${reportData.interviewId}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #4f46e5, #3b82f6); color: white; text-decoration: none; border-radius: 8px;">📄 View Full Report</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2026 SmartHire AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  _generateSessionAlertEmail(user, interview, action, alert, details) {
    const actionMessages = {
      started: 'Your interview session has started. Good luck! 🍀',
      paused: 'Your interview session has been paused. Ready to continue when you are.',
      resumed: 'Your interview session has been resumed. Keep going! 💪',
      ended: 'Your interview session has ended. You can review your performance.',
      completed: '🎉 Congratulations! You have completed your interview session!'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4f46e5, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px; }
          .message { font-size: 18px; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 16px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">${alert.emoji} ${alert.subject}</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <div class="message">${actionMessages[action] || 'Your interview session status has been updated.'}</div>
            
            <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 8px;">
              <p style="margin: 0; color: #6b7280;">
                <strong>Interview:</strong> ${interview.interview_type} - ${interview.domain}<br>
                <strong>Status:</strong> ${interview.status}<br>
                <strong>Time:</strong> ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 SmartHire AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  _generateReportData(interview) {
    let feedback = interview.feedback;
    if (typeof feedback === 'string') {
      try { feedback = JSON.parse(feedback); } catch (e) { feedback = {}; }
    }

    return {
      interviewId: interview.id,
      overallScore: interview.score || 0,
      performanceRating: this._getPerformanceRating(interview.score || 0),
      communication: feedback.communication_clarity || 0,
      confidence: feedback.confidence || 0,
      technical: feedback.technical_accuracy || 0,
      professionalism: feedback.professionalism || feedback.professionalism_score || 0,
      strengths: feedback.strengths || ['Good effort'],
      weaknesses: feedback.weaknesses || ['Keep practicing']
    };
  }

    _getSkillBreakdown(interviews) {
    const skills = {
      communication: { scores: [], count: 0 },
      confidence: { scores: [], count: 0 },
      technical: { scores: [], count: 0 },
      professionalism: { scores: [], count: 0 }
    };

    interviews.forEach(interview => {
      let feedback = interview.feedback;
      if (typeof feedback === 'string') {
        try { feedback = JSON.parse(feedback); } catch (e) { return; }
      }
      if (!feedback) return;

      if (feedback.communication_clarity !== undefined) {
        skills.communication.scores.push(feedback.communication_clarity);
        skills.communication.count++;
      }
      if (feedback.confidence !== undefined) {
        skills.confidence.scores.push(feedback.confidence);
        skills.confidence.count++;
      }
      if (feedback.technical_accuracy !== undefined) {
        skills.technical.scores.push(feedback.technical_accuracy);
        skills.technical.count++;
      }
      if (feedback.professionalism !== undefined || feedback.professionalism_score !== undefined) {
        const prof = feedback.professionalism || feedback.professionalism_score || 0;
        skills.professionalism.scores.push(prof);
        skills.professionalism.count++;
      }
    });

    // ✅ Return just the average number, not the object
    const result = {};
    for (const [key, data] of Object.entries(skills)) {
      result[key] = data.scores.length > 0 
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) 
        : 0;
    }
    return result;
  }

  _getPerformanceRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Average';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  }

  _getRecommendations(avgScore, skillBreakdown) {
    const recommendations = [];

    if (avgScore >= 85) {
      recommendations.push('Maintain your preparation level and practice advanced scenarios');
      recommendations.push('Consider helping others prepare for interviews');
    } else if (avgScore >= 70) {
      recommendations.push('Focus on weak areas while maintaining your strengths');
      recommendations.push('Practice advanced problem-solving scenarios');
    } else if (avgScore >= 55) {
      recommendations.push('Increase frequency of mock interview practice');
      recommendations.push('Work with a mentor for personalized guidance');
    } else {
      recommendations.push('Start with fundamentals and build foundational knowledge');
      recommendations.push('Seek professional coaching for interview preparation');
    }

    for (const [skill, data] of Object.entries(skillBreakdown)) {
      if (data.average < 60) {
        const skillNames = {
          communication: 'Communication Skills',
          confidence: 'Interview Confidence',
          technical: 'Technical Knowledge',
          professionalism: 'Professional Presentation'
        };
        recommendations.push(`Focus on improving ${skillNames[skill] || skill}`);
      }
    }

    return recommendations.slice(0, 5);
  }
}

module.exports = NotificationService;