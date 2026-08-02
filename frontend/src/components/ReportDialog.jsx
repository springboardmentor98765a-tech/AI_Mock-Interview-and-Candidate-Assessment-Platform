import React, { useState } from 'react';
import { REASONS } from '../lib/tickets';

export default function ReportDialog({ target, targetRole, onCancel, onSubmit }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (details.trim().length < 10) {
      setError('Add at least 10 characters so the admin can act on this.');
      return;
    }
    onSubmit({ reason, details: details.trim() });
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Report ${target}`}>
      <form className="modal-box" onSubmit={handleSubmit}>
        <h2>Report {target}</h2>
        <p className="muted">
          This raises a ticket for an administrator to review. The {targetRole} is not notified.
        </p>

        <div className="field">
          <label className="label" htmlFor="reason">
            Reason
          </label>
          <select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="details">
            What happened?
          </label>
          <textarea
            id="details"
            rows={4}
            value={details}
            placeholder="Describe the incident, including when it happened."
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="actions actions-end">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger">
            Submit report
          </button>
        </div>
      </form>
    </div>
  );
}
