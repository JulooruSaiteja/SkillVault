import React from 'react';
import { Link } from 'react-router-dom';

export function BookmarksPage() {
  return (
    <section>
      <div className="page-header">
        <span className="placeholder-badge">Phase 11 Placeholder</span>
        <h1 className="page-title">Personal Bookmarks</h1>
        <p className="page-description">Quick access to videos you saved for later reference.</p>
      </div>

      <div className="card">
        <p style={{ color: 'var(--color-text-muted)' }}>
          Your saved videos will appear here once you bookmark videos during study sessions.
        </p>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/" className="btn btn-secondary">
            Explore Catalog
          </Link>
        </div>
      </div>
    </section>
  );
}

export default BookmarksPage;
