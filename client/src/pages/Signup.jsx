import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import './Signup.css';

export function Signup() {
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
    <section className="auth-container">
      <div className="page-header auth-header">
        <h1 className="page-title">Create Account</h1>
        <p className="page-description">Begin your curated computing learning track.</p>
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
              htmlFor="signup-name"
              className="auth-label"
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
              className="auth-input"
            />
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="auth-label"
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
              className="auth-input"
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="auth-label"
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
              className="auth-input"
            />
          </div>

          <div>
            <label
              htmlFor="signup-confirm"
              className="auth-label"
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
              className="auth-input"
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary auth-submit-btn ${submitting ? 'is-submitting' : ''}`}
            disabled={submitting}
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}

export const SignupPage = Signup;
export default Signup;
