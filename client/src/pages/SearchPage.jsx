import React, { useState } from 'react';

export function SearchPage() {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
  };

  return (
    <section>
      <div className="page-header">
        <span className="placeholder-badge">Phase 7 Placeholder</span>
        <h1 className="page-title">Search SkillVault</h1>
        <p className="page-description">Find computing skills, curated playlists, and specific video lessons.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills, playlists, or videos (e.g. React, SQL, MERN)..."
            aria-label="Search query"
            style={{
              flex: '1',
              minWidth: '240px',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '1rem'
            }}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', marginTop: '1rem' }}>
          Full catalog search across skills, playlists, and videos will be integrated in Phase 7.
        </p>
      </div>
    </section>
  );
}

export default SearchPage;
