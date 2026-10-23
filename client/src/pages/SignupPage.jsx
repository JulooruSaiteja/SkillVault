import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export function SignupPage() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Full name must be at least 2 characters long.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ maxWidth: '440px', margin: '2rem auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Create Account</h1>
        <p className="page-description">Begin your curated computing learning track.</p>
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
              htmlFor="signup-name"
              style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}
            >
              Full Name
            </label>
            <input
              id="signup-name"
              type="text"
              required
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              htmlFor="signup-email"
              style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}
            >
              Email Address
            </label>
            <input
              id="signup-email"
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
              htmlFor="signup-password"
              style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}
            >
              Password (min. 6 characters)
            </label>
            <input
              id="signup-password"
              type="password"
              required
              autoComplete="new-password"
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

          <div>
            <label
              htmlFor="signup-confirm"
              style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}
            >
              Confirm Password
            </label>
            <input
              id="signup-confirm"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}

export default SignupPage;
