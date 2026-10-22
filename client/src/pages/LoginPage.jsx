import React from 'react';
import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <section style={{ maxWidth: '440px', margin: '2rem auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Sign In</h1>
        <p className="page-description">Access your learning progress and notes.</p>
      </div>

      <div className="card">
        <span className="placeholder-badge">Phase 5 Placeholder</span>
        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}>
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="name@example.com"
              disabled
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label htmlFor="login-password" style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              disabled
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            Sign In (Available in Phase 5)
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Don't have an account? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

export default LoginPage;
