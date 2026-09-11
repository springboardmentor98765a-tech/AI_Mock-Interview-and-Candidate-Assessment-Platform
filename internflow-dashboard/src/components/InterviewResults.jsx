import React, { useState, useEffect } from 'react';
import PerformanceReport from './PerformanceReport';
import ScoreHistory from './ScoreHistory';
import { scoringAPI } from '../services/scoringAPI';
import './InterviewResults.css';

/**
 * InterviewResults Component
 * Displays interview scoring results and performance report
 */
const InterviewResults = ({ 
  interviewId, 
  onRetake, 
  onNavigate,
  showHistory = true 
}) => {
  const [reportData, setReportData] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('report');

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch report data
        const reportResponse = await scoringAPI.getPerformanceReport(interviewId);
        if (reportResponse.success && reportResponse.data) {
          setReportData(reportResponse.data);
        } else {
          throw new Error(reportResponse.error || 'Failed to load report');
        }

        // Fetch score history
        if (showHistory) {
          try {
            const historyResponse = await scoringAPI.getInterviewHistory();
            if (historyResponse.success && historyResponse.data) {
              setScoreHistory(historyResponse.data.interviews || []);
            }
          } catch (historyError) {
            console.warn('Failed to load score history:', historyError);
            // Don't fail the entire component if history fails
          }
        }
      } catch (err) {
        console.error('Error loading results:', err);
        setError(err.message || 'Failed to load interview results');
      } finally {
        setLoading(false);
      }
    };

    if (interviewId) {
      loadResults();
    } else {
      setError('Interview ID is required');
      setLoading(false);
    }
  }, [interviewId, showHistory]);

  const handleRetake = () => {
    if (onRetake) {
      onRetake();
    }
  };

  const handleGoBack = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  const handleDownloadReport = () => {
    // TODO: Implement PDF download
    console.log('Download report clicked');
    alert('Report download feature coming soon!');
  };

  const handleShareResults = () => {
    // TODO: Implement share functionality
    console.log('Share results clicked');
    alert('Share feature coming soon!');
  };

  if (loading) {
    return (
      <div className="interview-results-container loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <h2>Analyzing your performance...</h2>
          <p>This may take a few moments. Please wait.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="interview-results-container error">
        <div className="error-box">
          <h2>⚠️ Error Loading Results</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={handleGoBack}>
              Back to Dashboard
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="interview-results-container error">
        <div className="error-box">
          <h2>No Results Available</h2>
          <p>Could not find scoring results for this interview.</p>
          <button className="btn btn-primary" onClick={handleGoBack}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-results-container">
      {/* Header */}
      <div className="results-header">
        <h1>Interview Results</h1>
        <p className="results-subtitle">
          Your comprehensive performance analysis is ready
        </p>

        {/* Action Buttons */}
        <div className="results-actions">
          <button className="btn btn-icon" title="Download PDF">
            📥 Download Report
          </button>
          <button className="btn btn-icon" title="Share results">
            📤 Share Results
          </button>
          <button className="btn btn-icon" title="Print">
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      {showHistory && scoreHistory.length > 0 && (
        <div className="results-tabs">
          <button
            className={`tab ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            📊 Latest Results
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📈 Score History
          </button>
        </div>
      )}

      {/* Content */}
      <div className="results-content">
        {activeTab === 'report' && (
          <PerformanceReport reportData={reportData} />
        )}

        {activeTab === 'history' && scoreHistory.length > 0 && (
          <ScoreHistory scores={scoreHistory} />
        )}
      </div>

      {/* Footer Actions */}
      <div className="results-footer">
        <button className="btn btn-secondary" onClick={handleGoBack}>
          ← Back to Dashboard
        </button>
        <div className="footer-spacer"></div>
        <button className="btn btn-primary" onClick={handleRetake}>
          🔄 Take Another Interview
        </button>
      </div>
    </div>
  );
};

export default InterviewResults;
