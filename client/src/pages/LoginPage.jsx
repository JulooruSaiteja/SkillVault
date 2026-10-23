import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
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
    <section style={{ maxWidth: '440px', margin: '2rem auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Sign In</h1>
        <p className="page-description">Access your computing progress and notes.</p>
      </div>

      <div className="card">
        {error && (
          <div
            role="alert"
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.9rem'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label
              htmlFor="login-email"
              style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}
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
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', cursor: submitting ? 'wait' : 'pointer' }}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Don't have an account? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

export default LoginPage;
