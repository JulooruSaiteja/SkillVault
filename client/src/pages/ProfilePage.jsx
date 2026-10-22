import React from 'react';

export function ProfilePage() {
  return (
    <section>
      <div className="page-header">
        <span className="placeholder-badge">Phase 16 Placeholder</span>
        <h1 className="page-title">Account Profile</h1>
        <p className="page-description">Manage personal details and password security.</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h3>Account Settings</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: '1rem 0' }}>
          Profile editing and password change functionality will be integrated with backend session verification in Phase 16.
        </p>
      </div>
    </section>
  );
}

export default ProfilePage;
