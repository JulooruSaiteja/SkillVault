import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import './Login.css';

export function Login() {
  const { login, user } = useAuth();
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
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
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
        {error && (
          <div role="alert" className="auth-error-alert">
            {error}
          </div>
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
