import React from 'react';

/**
 * The three states every fetched panel needs, in one place.
 *
 * `empty` renders when the call succeeded but there is nothing to show. A 404
 * is treated as empty rather than as an error, because "you have no résumé
 * yet" arrives as a 404.
 */
export function Panel({ loading, error, isEmpty, empty, children, onRetry }) {
  if (loading) return <p className="note">Loading…</p>;

  if (error && error.status !== 404) {
    return (
      <div>
        <p className="error">{error.detail ?? 'Something went wrong.'}</p>
        {onRetry && (
          <button className="btn" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (error?.status === 404 || isEmpty) {
    return <p className="note">{empty ?? 'Nothing to show yet.'}</p>;
  }

  return children;
}

/**
 * For a metric that has no data source at all — currently anything score-based,
 * which needs the scoring engine (Module 7).
 *
 * This deliberately renders no number. Showing "0%" or "—" next to a label like
 * "Average score" reads as a real result of zero; saying so in words does not.
 */
export function NotAvailable({ what, reason = 'Scoring is not implemented yet.' }) {
  return (
    <div className="card">
      <h2>{what}</h2>
      <p className="note">
        <span className="badge badge-muted">Not yet available</span>
      </p>
      <p className="muted">{reason}</p>
    </div>
  );
}
