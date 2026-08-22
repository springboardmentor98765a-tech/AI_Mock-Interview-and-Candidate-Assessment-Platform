import React, { useState, useEffect } from 'react';

const RecordingsTab = ({ user }) => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/recordings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setRecordings(data);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type) => {
    const labels = {
      'tr': 'Technical',
      'mr': 'Managerial',
      'hr': 'HR'
    };
    return labels[type] || type || 'General';
  };

  // ✅ FIXED: Play recording by fetching with auth header
  const playRecording = async (recordingId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Playing recording with token:', !!token);
      
      const response = await fetch(`http://localhost:5000/api/recordings/file/${recordingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert('Failed to load recording: ' + (error.error || 'Unknown error'));
        return;
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error playing recording:', error);
      alert('Error playing recording');
    }
  };

  const deleteRecording = async (recordingId) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/recordings/${recordingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        alert('Recording deleted successfully');
        fetchRecordings();
      } else {
        alert('Failed to delete recording');
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <div className="header-left">
          <h2>📹 My Recordings</h2>
          <p>View and manage your interview recordings.</p>
        </div>
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchRecordings}
        >
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      <div className="recordings-container">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading your recordings...</p>
          </div>
        ) : recordings.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-video"></i>
            <h4>No Recordings Yet</h4>
            <p>Complete an interview with recording to save your sessions here.</p>
          </div>
        ) : (
          <div className="recordings-grid">
            {recordings.map((recording) => (
              <div key={recording.id} className="recording-card">
                <div className="recording-thumbnail">
                  <i className="fas fa-video"></i>
                  <span className="duration-badge">{formatDuration(recording.duration)}</span>
                </div>
                <div className="recording-info">
                  <h5>{getTypeLabel(recording.interview_type)} - {recording.domain || 'General'}</h5>
                  <p className="recording-meta">
                    <span>📅 {formatDate(recording.created_at)}</span>
                    <span>💾 {formatFileSize(recording.file_size)}</span>
                  </p>
                  <div className="recording-actions">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => playRecording(recording.id)}
                    >
                      <i className="fas fa-play"></i> Play
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteRecording(recording.id)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingsTab;