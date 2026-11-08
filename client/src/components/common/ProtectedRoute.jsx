import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './ProtectedRoute.css';

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
      <div className="auth-loading-state">
        <p className="auth-loading-text">Checking authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return (
      <div className="access-denied-container">
        <div className="card">
          <h2 className="access-denied-title">Access Denied</h2>
          <p className="access-denied-message">
            You do not have administrative privileges to view this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
