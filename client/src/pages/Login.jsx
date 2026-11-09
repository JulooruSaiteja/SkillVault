import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import ErrorAlert from '../components/common/ErrorAlert';
import './Login.css';

export function Login() {
  const { login, user, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const destination = location.state?.from?.pathname || '/dashboard';
    navigate(destination, { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError({ message: 'Please provide both email address and password.' });
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-container">
      <div className="page-header auth-header">
        <h1 className="page-title">Sign In</h1>
        <p className="page-description">Access your classroom progress, notes, and quiz history.</p>
      </div>

      <div className="card">
        {sessionExpiredMessage && !error && (
          <ErrorAlert
            variant="warning"
            title="Session Expired"
            message={sessionExpiredMessage}
            onDismiss={clearSessionExpiredMessage}
          />
        )}

        {error && (
          <ErrorAlert
            variant="error"
            title="Sign In Failed"
            message={typeof error === 'string' ? error : error.message || 'Invalid email or password.'}
            errors={error.errors}
            isRetryable={Boolean(error.isRetryable || error.isNetworkError)}
            onRetry={handleSubmit}
            retryLabel="Retry Sign In"
            onDismiss={() => setError(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label
              htmlFor="login-email"
              className="auth-label"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="auth-input"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="auth-label"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="auth-input"
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary auth-submit-btn ${submitting ? 'is-submitting' : ''}`}
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer-text">
          Don't have an account? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

export const LoginPage = Login;
export default Login;
