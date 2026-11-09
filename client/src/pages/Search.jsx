import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import './Search.css';

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

export function Search() {
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
          Find skills, curated structured playlists, and targeted technical lessons across SkillVault.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="card search-card">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search skills, playlists, or videos (e.g. React, SQL, MERN)..."
              aria-label="Search catalog"
              className="search-input"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search query"
                className="search-clear-btn"
              >
                ✕
              </button>
            )}
          </div>

          <button type="submit" className="btn btn-primary search-submit-btn">
            Search
          </button>
        </form>

        {/* Popular Suggestions */}
        <div className="search-suggestions-row">
          <span className="search-suggestions-label">Popular:</span>
          {POPULAR_SUGGESTIONS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleSuggestionClick(term)}
              className="search-suggestion-pill"
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
          className="search-tabs-list"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => handleTabChange('all')}
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'} search-tab-btn`}
          >
            All Results ({totalCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'skills'}
            onClick={() => handleTabChange('skills')}
            className={`btn ${activeTab === 'skills' ? 'btn-primary' : 'btn-secondary'} search-tab-btn`}
          >
            Skills ({counts.skills})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'playlists'}
            onClick={() => handleTabChange('playlists')}
            className={`btn ${activeTab === 'playlists' ? 'btn-primary' : 'btn-secondary'} search-tab-btn`}
          >
            Playlists ({counts.playlists})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'videos'}
            onClick={() => handleTabChange('videos')}
            className={`btn ${activeTab === 'videos' ? 'btn-primary' : 'btn-secondary'} search-tab-btn`}
          >
            Videos ({counts.videos})
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="search-loading" aria-busy="true" aria-live="polite">
          <p className="search-loading-text">Searching classroom catalog...</p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div role="alert" className="search-error-banner">
          <p className="search-error-msg">{error}</p>
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
        <div className="card search-empty-state">
          <div className="search-empty-icon">🔍</div>
          <h3>No matches found for &ldquo;{resultsData.query}&rdquo;</h3>
          <p className="search-empty-desc">
            We couldn&apos;t find any active skills, playlists, or videos matching your query. Try searching with different keywords or exploring popular domains.
          </p>
          <div className="search-empty-actions">
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
        <div className="card search-initial-state">
          <div className="search-empty-icon">⚡</div>
          <h3>Search Technical Topics</h3>
          <p className="search-empty-desc">
            Enter a keyword above to find computer science topics, software engineering playlists, and individual video lessons.
          </p>
          <Link to="/categories" className="btn btn-secondary">
            Explore All Categories &rarr;
          </Link>
        </div>
      )}

      {/* Results Display */}
      {!loading && !error && resultsData && totalCount > 0 && (
        <div className="search-results-container">
          {/* Skills Section */}
          {(activeTab === 'all' || activeTab === 'skills') && skills.length > 0 && (
            <div>
              <h2 className="search-section-heading">
                <span>Skills</span>
                <span className="search-count-label">({skills.length})</span>
              </h2>
              <div className="search-skills-grid">
                {skills.map((skill) => (
                  <article
                    key={skill.id}
                    className="card search-skill-card"
                  >
                    <div>
                      <div className="search-card-top-row">
                        <span className="search-badge-skill">
                          Skill
                        </span>
                        {skill.category && (
                          <span className="search-category-pill">
                            {skill.category.name}
                          </span>
                        )}
                      </div>

                      <h3 className="search-result-title">
                        <Link to={skill.url}>
                          {skill.icon && <span className="search-result-icon">{skill.icon}</span>}
                          {skill.name}
                        </Link>
                      </h3>

                      {skill.description && (
                        <p className="search-result-desc">
                          {skill.description}
                        </p>
                      )}
                    </div>

                    <div className="search-action-wrapper">
                      <Link to={skill.url} className="btn btn-secondary search-action-btn">
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
              <h2 className="search-section-heading">
                <span>Playlists</span>
                <span className="search-count-label">({playlists.length})</span>
              </h2>
              <div className="search-playlists-grid">
                {playlists.map((playlist) => (
                  <article
                    key={playlist.id}
                    className="card search-playlist-card"
                  >
                    <div>
                      <div className="search-card-top-row">
                        <span className="search-badge-playlist">
                          Playlist
                        </span>
                        {playlist.skill && (
                          <span className="search-category-pill">
                            {playlist.skill.name}
                          </span>
                        )}
                      </div>

                      <h3 className="search-result-title">
                        <Link to={playlist.url}>
                          {playlist.title}
                        </Link>
                      </h3>

                      {playlist.description && (
                        <p className="search-result-desc">
                          {playlist.description}
                        </p>
                      )}
                    </div>

                    <div className="search-action-wrapper">
                      <Link to={playlist.url} className="btn btn-secondary search-action-btn">
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
              <h2 className="search-section-heading">
                <span>Videos</span>
                <span className="search-count-label">({videos.length})</span>
              </h2>
              <div className="search-videos-list">
                {videos.map((video) => (
                  <article
                    key={video.id}
                    className="card search-video-item"
                  >
                    <div className="search-video-meta">
                      <div className="search-video-badge-row">
                        <span className="search-badge-video">
                          Video
                        </span>
                        {video.skill && (
                          <span className="search-category-pill">
                            {video.skill.name}
                          </span>
                        )}
                        {video.playlist && (
                          <span className="search-category-pill">
                            • {video.playlist.title}
                          </span>
                        )}
                      </div>

                      <h3 className="search-video-title">
                        <Link to={video.url}>
                          {video.title}
                        </Link>
                      </h3>

                      <div className="search-video-details">
                        <span className="search-video-duration">
                          ⏱️ {formatDuration(video.durationSeconds)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Link to={video.url} className="btn btn-secondary search-video-watch-btn">
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

export const SearchPage = Search;
export default Search;
