import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const POPULAR_SUGGESTIONS = [
  'Python',
  'React',
  'JavaScript',
  'PostgreSQL',
  'Algorithms',
  'Data Science',
  'MERN'
];

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  }
  return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultsData, setResultsData] = useState(null);

  const executeSearch = useCallback(async (queryText, typeFilter = 'all') => {
    const trimmed = queryText.trim();
    if (!trimmed || trimmed.length < 2) {
      setResultsData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const typeParam = typeFilter && typeFilter !== 'all' ? `&type=${typeFilter}` : '';
      const res = await api.get(`/search?q=${encodeURIComponent(trimmed)}${typeParam}`);
      setResultsData(res?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to search catalog. Please try again.');
      setResultsData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync with URL params on mount or when searchParams change
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    const urlType = searchParams.get('type') || 'all';
    setSearchInput(urlQuery);
    setActiveTab(urlType);

    if (urlQuery.trim().length >= 2) {
      executeSearch(urlQuery, urlType);
    } else {
      setResultsData(null);
    }
  }, [searchParams, executeSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    if (trimmed.length < 2) {
      setError('Search query must be at least 2 characters long.');
      return;
    }

    const params = { q: trimmed };
    if (activeTab !== 'all') {
      params.type = activeTab;
    }
    setSearchParams(params);
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const trimmed = searchInput.trim();
    if (trimmed.length >= 2) {
      const params = { q: trimmed };
      if (newTab !== 'all') {
        params.type = newTab;
      }
      setSearchParams(params);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchInput(suggestion);
    setSearchParams({ q: suggestion });
  };

  const handleClear = () => {
    setSearchInput('');
    setResultsData(null);
    setError(null);
    setSearchParams({});
  };

  // Determine items to display based on active tab
  const skills = resultsData?.results?.skills || [];
  const playlists = resultsData?.results?.playlists || [];
  const videos = resultsData?.results?.videos || [];

  const counts = resultsData?.counts || {
    skills: skills.length,
    playlists: playlists.length,
    videos: videos.length
  };
  const totalCount = resultsData?.totalResults ?? (skills.length + playlists.length + videos.length);

  return (
    <section>
      <div className="page-header">
        <h1 className="page-title">Search Catalog</h1>
        <p className="page-description">
          Find computing skills, curated structured playlists, and targeted technical lessons across SkillVault.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search skills, playlists, or videos (e.g. React, SQL, MERN)..."
              aria-label="Search catalog"
              style={{
                width: '100%',
                padding: '0.75rem 2.5rem 0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: '1rem'
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search query"
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-dim)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: '0.25rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
            Search
          </button>
        </form>

        {/* Popular Suggestions */}
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>Popular:</span>
          {POPULAR_SUGGESTIONS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleSuggestionClick(term)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                borderRadius: 'var(--radius-full)',
                padding: '0.2rem 0.65rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs (when query submitted or results active) */}
      {resultsData && (
        <div
          role="tablist"
          aria-label="Result type filters"
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '0.5rem',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => handleTabChange('all')}
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.875rem', padding: '0.4rem 0.85rem' }}
          >
            All Results ({totalCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'skills'}
            onClick={() => handleTabChange('skills')}
            className={`btn ${activeTab === 'skills' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.875rem', padding: '0.4rem 0.85rem' }}
          >
            Skills ({counts.skills})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'playlists'}
            onClick={() => handleTabChange('playlists')}
            className={`btn ${activeTab === 'playlists' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.875rem', padding: '0.4rem 0.85rem' }}
          >
            Playlists ({counts.playlists})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'videos'}
            onClick={() => handleTabChange('videos')}
            className={`btn ${activeTab === 'videos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.875rem', padding: '0.4rem 0.85rem' }}
          >
            Videos ({counts.videos})
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }} aria-busy="true" aria-live="polite">
          <p style={{ color: 'var(--color-text-muted)' }}>Searching computing catalog...</p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            maxWidth: '600px',
            margin: '2rem auto',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            textAlign: 'center'
          }}
        >
          <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>
          <button
            type="button"
            onClick={() => executeSearch(searchInput, activeTab)}
            className="btn btn-secondary"
          >
            Retry Search
          </button>
        </div>
      )}

      {/* No Results Empty State */}
      {!loading && !error && resultsData && totalCount === 0 && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            maxWidth: '600px',
            margin: '2rem auto'
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
          <h3>No matches found for &ldquo;{resultsData.query}&rdquo;</h3>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            We couldn&apos;t find any active skills, playlists, or videos matching your query. Try searching with different keywords or exploring popular domains.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/categories" className="btn btn-primary">
              Browse Categories
            </Link>
            <button
              type="button"
              onClick={handleClear}
              className="btn btn-secondary"
            >
              Clear Search
            </button>
          </div>
        </div>
      )}

      {/* Initial State (Before Searching) */}
      {!loading && !error && !resultsData && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            maxWidth: '700px',
            margin: '1rem auto'
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚡</div>
          <h3>Search Technical Topics</h3>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Enter a keyword above to find computer science topics, software engineering playlists, and individual video lessons.
          </p>
          <Link to="/categories" className="btn btn-secondary">
            Explore All Categories &rarr;
          </Link>
        </div>
      )}

      {/* Results Display */}
      {!loading && !error && resultsData && totalCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Skills Section */}
          {(activeTab === 'all' || activeTab === 'skills') && skills.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Skills</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>({skills.length})</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {skills.map((skill) => (
                  <article
                    key={skill.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '1.25rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--color-accent)',
                            backgroundColor: 'rgba(129, 140, 248, 0.1)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          Skill
                        </span>
                        {skill.category && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                            {skill.category.name}
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.15rem', margin: '0.25rem 0 0.5rem 0' }}>
                        <Link to={skill.url} style={{ color: 'var(--color-text)' }}>
                          {skill.icon && <span style={{ marginRight: '0.4rem' }}>{skill.icon}</span>}
                          {skill.name}
                        </Link>
                      </h3>

                      {skill.description && (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                          {skill.description}
                        </p>
                      )}
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <Link to={skill.url} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                        Explore Skill &rarr;
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Playlists Section */}
          {(activeTab === 'all' || activeTab === 'playlists') && playlists.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Playlists</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>({playlists.length})</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {playlists.map((playlist) => (
                  <article
                    key={playlist.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '1.25rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--color-warning)',
                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          Playlist
                        </span>
                        {playlist.skill && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                            {playlist.skill.name}
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.15rem', margin: '0.25rem 0 0.5rem 0' }}>
                        <Link to={playlist.url} style={{ color: 'var(--color-text)' }}>
                          {playlist.title}
                        </Link>
                      </h3>

                      {playlist.description && (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                          {playlist.description}
                        </p>
                      )}
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <Link to={playlist.url} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                        View Playlist &rarr;
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Videos Section */}
          {(activeTab === 'all' || activeTab === 'videos') && videos.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Videos</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>({videos.length})</span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {videos.map((video) => (
                  <article
                    key={video.id}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: '1', minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--color-primary)',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            padding: '0.1rem 0.45rem',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          Video
                        </span>
                        {video.skill && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                            {video.skill.name}
                          </span>
                        )}
                        {video.playlist && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                            • {video.playlist.title}
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.35rem 0' }}>
                        <Link to={video.url} style={{ color: 'var(--color-text)' }}>
                          {video.title}
                        </Link>
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          ⏱️ {formatDuration(video.durationSeconds)}
                        </span>
                        {video.hasTranscript ? (
                          <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>
                            ✓ Transcript Available
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-dim)' }}>
                            Metadata Fallback
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Link to={video.url} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
                        Watch Video &rarr;
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default SearchPage;
