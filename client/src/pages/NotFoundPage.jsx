import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="not-found-container" role="alert">
      <div className="not-found-code">404</div>
      <h1 className="page-title">Page Not Found</h1>
      <p className="page-description" style={{ margin: '1rem 0' }}>
        The requested path <code style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-surface)', padding: '0.2rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>{location.pathname}</code> does not exist in SkillVault.
      </p>
      <div style={{ marginTop: '1.5rem' }}>
        <Link to="/" className="btn btn-primary">
          Return to Explore
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
