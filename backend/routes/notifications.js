// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

const notificationService = new NotificationService();

// =============================================
// 1. SEND INTERVIEW REMINDER
// =============================================
router.post('/reminder/:interviewId', auth, async (req, res) => {
  try {
    const { hoursBefore = 24 } = req.body;
    const result = await notificationService.sendInterviewReminder(
      req.user.id,
      req.params.interviewId,
      hoursBefore
    );
    
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 2. SEND PERFORMANCE REPORT
// =============================================
router.post('/report/:interviewId', auth, async (req, res) => {
  try {
    const result = await notificationService.sendPerformanceReport(
      req.user.id,
      req.params.interviewId
    );
    
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error sending report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 3. SEND SESSION ALERT
// =============================================
router.post('/session-alert/:interviewId', auth, async (req, res) => {
  try {
    const { action, details = {} } = req.body;
    const result = await notificationService.sendSessionAlert(
      req.user.id,
      req.params.interviewId,
      action,
      details
    );
    
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error sending session alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 4. GENERATE PERFORMANCE SUMMARY
// =============================================
router.get('/summary', auth, async (req, res) => {
  try {
    const { timeRange = 'all' } = req.query;
    const result = await notificationService.generatePerformanceSummary(
      req.user.id,
      timeRange
    );
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 5. GET NOTIFICATION HISTORY
// =============================================
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await notificationService.getNotificationHistory(
      req.user.id,
      parseInt(limit)
    );
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 6. MARK NOTIFICATION AS READ
// =============================================
router.put('/read/:notificationId', auth, async (req, res) => {
  try {
    const result = await notificationService.markAsRead(
      req.params.notificationId,
      req.user.id
    );
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;