import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="center">
      <span className="badge badge-bad">Error 404</span>
      <h1>Page not found</h1>
      <p className="muted">
        That route does not exist. It may have been moved, or the link you followed is out of date.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to home
      </Link>
    </div>
  );
}
