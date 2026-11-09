import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './NotFound.css';

export function NotFound() {
  const location = useLocation();

  return (
    <div className="not-found-container" role="alert">
      <div className="not-found-code">404</div>
      <h1 className="page-title">Page Not Found</h1>
      <p className="page-description not-found-desc">
        The requested path <code className="not-found-code-badge">{location.pathname}</code> does not exist in SkillVault.
      </p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
        <Link to="/categories" className="btn btn-secondary">
          Browse Subjects
        </Link>
      </div>
    </div>
  );
}

export const NotFoundPage = NotFound;
export default NotFound;
