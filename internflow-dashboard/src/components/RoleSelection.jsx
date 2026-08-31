import React, { useState } from 'react';
import '../styles/RoleSelection.css';

const RoleSelection = ({ user, onRoleSelect }) => {
  const [selectedRole, setSelectedRole] = useState('USER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roles = [
    { value: 'USER', label: '🎓 Candidate', description: 'Practice mock interviews, track progress, and improve your skills' },
    { value: 'RECRUITER', label: '👔 Recruiter', description: 'Manage candidates, view rankings, and conduct interviews' },
    { value: 'ADMIN', label: '👑 Admin', description: 'Configure platform, manage users, and monitor system' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5001/api/oauth/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      // Update user in localStorage
      const updatedUser = { ...user, role: selectedRole };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Call parent to handle login
      onRoleSelect(updatedUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-card">
        <div className="role-selection-header">
          <h2>Welcome, {user.name}! 👋</h2>
          <p>Please select your role to continue</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3" style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="role-options">
            {roles.map((role) => (
              <div
                key={role.value}
                className={`role-option ${selectedRole === role.value ? 'selected' : ''}`}
                onClick={() => setSelectedRole(role.value)}
              >
                <div className="role-radio">
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={selectedRole === role.value}
                    onChange={() => setSelectedRole(role.value)}
                  />
                </div>
                <div className="role-info">
                  <div className="role-label">{role.label}</div>
                  <div className="role-description">{role.description}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="btn-role-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Setting up...
              </>
            ) : (
              <>
                <i className="fas fa-check-circle me-2"></i>
                Continue to Dashboard
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoleSelection;