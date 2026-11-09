import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import './Playlist.css';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins > 0 ? `${remMins}m` : ''}`.trim();
  }
  return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
}

export function Playlist() {
  const { playlistId } = useParams();
  const { isAuthenticated } = useAuth();

  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlaylistData = useCallback(async () => {
    if (!playlistId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/playlists/${encodeURIComponent(playlistId)}`);
      setPlaylist(res?.data?.playlist || null);
      setVideos(res?.data?.videos || []);
      setStats(res?.data?.stats || null);
    } catch (err) {
      setError(err.message || 'Failed to load playlist curriculum. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    fetchPlaylistData();
  }, [fetchPlaylistData]);

  if (loading) {
    return (
      <section className="playlist-skeleton-root" aria-busy="true" aria-live="polite">
        <nav aria-label="Breadcrumb" className="breadcrumb-nav">
          <ol className="breadcrumb-list">
            <li><span className="playlist-skeleton-pill skeleton-pill-sm" /></li>
            <li className="breadcrumb-separator" aria-hidden="true">/</li>
            <li><span className="playlist-skeleton-pill skeleton-pill-md" /></li>
            <li className="breadcrumb-separator" aria-hidden="true">/</li>
            <li><span className="playlist-skeleton-pill skeleton-pill-lg" /></li>
          </ol>
        </nav>

        <div className="card playlist-header-card playlist-skeleton-card">
          <div className="playlist-meta-row">
            <span className="playlist-skeleton-pill skeleton-pill-sm" />
            <span className="playlist-skeleton-pill skeleton-pill-md" />
          </div>
          <div className="playlist-skeleton-line skeleton-title" />
          <div className="playlist-skeleton-line skeleton-desc" />
          <div className="playlist-skeleton-line skeleton-desc-short" />
        </div>

        <div className="playlist-videos-section">
          <div className="playlist-skeleton-line skeleton-section-header" />
          <div className="playlist-videos-list">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card playlist-video-row playlist-skeleton-row">
                <span className="playlist-skeleton-pill skeleton-row-num" />
                <div className="playlist-video-main">
                  <div className="playlist-skeleton-line skeleton-row-title" />
                  <div className="playlist-skeleton-line skeleton-row-sub" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !playlist) {
    return (
      <section>
        <div role="alert" className="playlist-error-banner">
          <h2 className="playlist-error-title">Playlist Unavailable</h2>
          <p className="playlist-error-msg">
            {error || 'The requested playlist could not be found or has been deactivated.'}
          </p>
          <div className="playlist-error-actions">
            <button type="button" onClick={fetchPlaylistData} className="btn btn-secondary">
              Retry
            </button>
            <Link to="/categories" className="btn btn-primary">
              Browse Catalog
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const skill = playlist.skill;
  const category = skill?.category;
  const progressPct = stats?.progressPercentage ?? 0;
  const completedCount = stats?.completedVideos ?? 0;
  const totalCount = stats?.totalVideos ?? videos.length;
  const totalDuration = stats?.totalDurationSeconds ?? 0;

  return (
    <section>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="breadcrumb-nav">
        <ol className="breadcrumb-list">
          <li>
            <Link to="/categories" className="breadcrumb-link">
              Categories
            </Link>
          </li>
          {category && (
            <>
              <li className="breadcrumb-separator" aria-hidden="true">/</li>
              <li>
                <Link to="/categories" className="breadcrumb-link">
                  {category.name}
                </Link>
              </li>
            </>
          )}
          {skill && (
            <>
              <li className="breadcrumb-separator" aria-hidden="true">/</li>
              <li>
                <Link to={`/skills/${skill.slug}`} className="breadcrumb-link">
                  {skill.name}
                </Link>
              </li>
            </>
          )}
          <li className="breadcrumb-separator" aria-hidden="true">/</li>
          <li className="breadcrumb-current">{playlist.title}</li>
        </ol>
      </nav>

      {/* Playlist Header Card */}
      <div className="card playlist-header-card">
        <div className="playlist-meta-row">
          <span className="playlist-curated-badge">
            Curated Course Track
          </span>
          {skill && (
            <Link to={`/skills/${skill.slug}`} className="playlist-skill-tag">
              {skill.icon && <span className="playlist-skill-icon">{skill.icon}</span>}
              {skill.name}
            </Link>
          )}
          {playlist.externalYoutubePlaylistId && (
            <span className="playlist-external-id">
              ID: {playlist.externalYoutubePlaylistId}
            </span>
          )}
        </div>

        <h1 className="page-title playlist-title">
          {playlist.title}
        </h1>

        {playlist.description && (
          <p className="playlist-description">
            {playlist.description}
          </p>
        )}

        {/* Dynamic Progress Display */}
        <div className="playlist-progress-box">
          <div className="playlist-progress-header">
            <div className="playlist-progress-title-row">
              <span className="playlist-progress-title">Track Completion</span>
              {stats?.isCompleted && (
                <span className="playlist-completed-badge">
                  ✓ Completed
                </span>
              )}
            </div>
            <div className="playlist-progress-stats">
              <span className="playlist-progress-count">
                {completedCount} of {totalCount} completed ({progressPct}%)
              </span>
              {totalDuration > 0 && (
                <span className="playlist-progress-duration">
                  Total: {formatDuration(totalDuration)}
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar Track */}
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="Playlist completion progress"
            className="playlist-progress-track"
          >
            <div
              className={`playlist-progress-fill ${progressPct === 100 ? 'is-complete' : ''}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {!isAuthenticated && (
            <p className="playlist-signin-prompt">
              <Link to="/login">Sign in</Link> to automatically save video progress and track your curriculum completion.
            </p>
          )}
        </div>
      </div>

      {/* Constituent Videos Section */}
      <div>
        <div className="playlist-lessons-header">
          <h2 className="playlist-lessons-title">
            Curriculum Lessons ({videos.length})
          </h2>
          {videos.length > 0 && (
            <Link
              to={`/videos/${videos[0]._id}`}
              className="btn btn-primary playlist-start-btn"
            >
              Start Course &rarr;
            </Link>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="card playlist-empty-card">
            <p>No videos have been added to this playlist yet.</p>
            {skill && (
              <Link to={`/skills/${skill.slug}`} className="btn btn-secondary playlist-empty-back-btn">
                Back to {skill.name}
              </Link>
            )}
          </div>
        ) : (
          <div className="playlist-lessons-list">
            {videos.map((video, idx) => (
              <article
                key={video._id}
                className={`card playlist-video-item ${video.isCompleted ? 'is-completed' : ''}`}
              >
                <div className="playlist-video-meta">
                  <span className="playlist-video-index">
                    #{idx + 1}
                  </span>

                  <div>
                    <h3 className="playlist-video-title">
                      <Link to={`/videos/${video._id}`}>
                        {video.title}
                      </Link>
                    </h3>

                    <div className="playlist-video-details">
                      <span className="playlist-video-duration">
                        ⏱️ {formatDuration(video.durationSeconds)}
                      </span>

                      {video.isCompleted && (
                        <span className="playlist-video-completed-tag">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Link
                    to={`/videos/${video._id}`}
                    className={`btn ${video.isCompleted ? 'btn-secondary' : 'btn-primary'} playlist-video-action-btn`}
                  >
                    {video.isCompleted ? 'Review Lesson' : 'Watch Lesson'} &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export const PlaylistPage = Playlist;
export default Playlist;
