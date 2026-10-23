import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/**
 * Route protection wrapper.
 * Ensures user is authenticated and optionally has admin role.
 *
 * @param {{ children: React.ReactNode, adminOnly?: boolean }} props
 */
export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Checking authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="card">
          <h2 style={{ color: 'var(--color-danger, #e53e3e)' }}>Access Denied</h2>
          <p style={{ margin: '1rem 0', color: 'var(--color-text-muted)' }}>
            You do not have administrative privileges to view this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
