// internflow-dashboard/src/components/NotificationsPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import './NotificationsPanel.css';

const NotificationsPanel = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  // =============================================
  // FETCH NOTIFICATIONS
  // =============================================
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/notifications/history?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data || []);
        const unread = (data.data || []).filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // MARK AS READ
  // =============================================
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5001/api/notifications/read/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // =============================================
  // MARK ALL AS READ
  // =============================================
  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.is_read);
    for (const notif of unreadNotifs) {
      await markAsRead(notif.id);
    }
  };

  // =============================================
  // CLOSE PANEL WHEN CLICKING OUTSIDE
  // =============================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // =============================================
  // AUTO REFRESH EVERY 30 SECONDS
  // =============================================
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // =============================================
  // HELPERS
  // =============================================
  const getNotificationIcon = (type) => {
    const icons = {
      'interview_reminder': '🔔',
      'performance_report': '📊',
      'session_started': '▶️',
      'session_paused': '⏸️',
      'session_resumed': '▶️',
      'session_ended': '⏹️',
      'session_completed': '🎉'
    };
    return icons[type] || '📧';
  };

  const formatTime = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="notifications-wrapper" ref={panelRef}>
      {/* Bell Icon */}
      <button 
        className="notification-bell"
        onClick={() => setShowPanel(!showPanel)}
        aria-label="Notifications"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Panel */}
      {showPanel && (
        <div className="notification-panel">
          <div className="panel-header">
            <h4>📬 Notifications</h4>
            <div className="header-actions">
              {unreadCount > 0 && (
                <button className="mark-all-btn" onClick={markAllAsRead}>
                  Mark all read
                </button>
              )}
              <button className="close-btn" onClick={() => setShowPanel(false)}>×</button>
            </div>
          </div>
          
          <div className="panel-body">
            {loading ? (
              <div className="loading-state">
                <div className="mini-spinner"></div>
                <p>Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-inbox"></i>
                <p>No notifications yet</p>
                <span className="empty-hint">You'll see reminders, reports, and alerts here</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notif.subject || notif.type}</div>
                    <div className="notification-time">{formatTime(notif.sent_at)}</div>
                  </div>
                  {!notif.is_read && (
                    <div className="notification-dot"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="panel-footer">
              <button 
                className="view-all-btn"
                onClick={() => {
                  setShowPanel(false);
                  // Optional: navigate to full notifications page
                }}
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;