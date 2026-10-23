import React from 'react';
import useAuth from '../hooks/useAuth';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <section style={{ maxWidth: '640px', margin: '2rem auto' }}>
      <div className="page-header">
        <h1 className="page-title">Account Profile</h1>
        <p className="page-description">Your SkillVault learner credentials and account details.</p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              color: 'var(--color-primary, #60a5fa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{user?.name || 'Learner'}</h2>
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-sm, 4px)',
                backgroundColor: user?.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: user?.role === 'admin' ? '#f87171' : '#60a5fa',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            >
              {user?.role || 'learner'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Email Address
            </label>
            <p style={{ margin: 0, fontWeight: 500 }}>{user?.email || 'N/A'}</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Account Status
            </label>
            <p style={{ margin: 0, fontWeight: 500, color: user?.isActive ? '#4ade80' : '#f87171' }}>
              {user?.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Account ID
            </label>
            <p style={{ margin: 0, fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
              {user?.id || user?._id || 'N/A'}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Member Since
            </label>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recent'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;
