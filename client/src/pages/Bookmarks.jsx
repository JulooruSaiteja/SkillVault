import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Bookmarks.css';

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

export function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/bookmarks');
      setBookmarks(res?.data?.bookmarks || []);
    } catch (err) {
      setError(err.message || 'Failed to load your bookmarked lessons. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleRemoveBookmark = async (videoId) => {
    if (!videoId || removingId) return;
    setRemovingId(videoId);
    try {
      await api.delete(`/bookmarks/${videoId}`);
      setBookmarks((prev) => prev.filter((b) => b.video._id !== videoId && b._id !== videoId));
    } catch (err) {
      alert(`Could not remove bookmark: ${err.message}`);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section>
      {/* Page Header */}
      <div className="page-header bookmarks-header">
        <div className="bookmarks-header-row">
          <div>
            <h1 className="page-title bookmarks-title">
              <span>🔖</span> Personal Bookmarks
            </h1>
            <p className="page-description">
              Your saved technical videos, algorithms, architectures, and data systems lessons.
            </p>
          </div>
          {!loading && bookmarks.length > 0 && (
            <span className="bookmarks-count-pill">
              {bookmarks.length} {bookmarks.length === 1 ? 'lesson' : 'lessons'} saved
            </span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bookmarks-loading" aria-busy="true" aria-live="polite">
          <p className="bookmarks-loading-text">Loading your saved collection...</p>
        </div>
      )}

      {/* Error Alert */}
      {!loading && error && (
        <div role="alert" className="bookmarks-error-banner">
          <p className="bookmarks-error-text">{error}</p>
          <button type="button" onClick={fetchBookmarks} className="btn btn-secondary">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && bookmarks.length === 0 && (
        <div className="card bookmarks-empty-card">
          <div className="bookmarks-empty-icon">🔖</div>
          <h2 className="bookmarks-empty-title">No Bookmarks Yet</h2>
          <p className="bookmarks-empty-desc">
            You haven't bookmarked any videos yet. When watching a lesson, click the <strong>Bookmark</strong> button to save it to your personal technical library.
          </p>
          <Link to="/categories" className="btn btn-primary">
            Explore Learning Tracks
          </Link>
        </div>
      )}

      {/* Bookmarks Grid */}
      {!loading && !error && bookmarks.length > 0 && (
        <div className="bookmarks-grid">
          {bookmarks.map((item) => {
            const video = item.video;
            const skill = video?.skill;
            const playlist = video?.playlist;
            const isArchived = Boolean(item.isArchived);
            const userProgress = video?.userProgress;
            const isCompleted = Boolean(userProgress?.isCompleted);
            const isRemoving = removingId === video._id || removingId === item._id;

            return (
              <article
                key={item._id}
                className={`card bookmark-card ${isRemoving ? 'is-removing' : ''} ${isArchived ? 'is-archived' : ''}`}
              >
                <div>
                  {/* Badges Row */}
                  <div className="bookmark-badges-row">
                    {skill && (
                      <span className="bookmark-skill-badge">
                        {skill.name}
                      </span>
                    )}

                    <span className="bookmark-duration">
                      ⏱️ {formatDuration(video.durationSeconds)}
                    </span>

                    {isCompleted && (
                      <span className="bookmark-completed-badge">
                        ✓ Completed
                      </span>
                    )}
                  </div>

                  {/* Soft-Deactivation / Inactive Archive Notice */}
                  {isArchived && (
                    <div className="bookmark-archived-banner">
                      <span className="bookmark-archived-label">
                        ⚠️ Archived / Retired Lesson
                      </span>
                      <p className="bookmark-archived-text">
                        This content was deactivated from public browsing, but is preserved in your personal vault.
                      </p>
                    </div>
                  )}

                  {/* Video Title */}
                  <h2 className="bookmark-video-title">
                    <Link
                      to={`/videos/${video.slug || video._id}`}
                      className={`bookmark-video-link ${isArchived ? 'is-archived' : ''}`}
                    >
                      {video.title}
                    </Link>
                  </h2>

                  {/* Playlist series connection if part of a playlist */}
                  {playlist && (
                    <p className="bookmark-playlist-connection">
                      Part of{' '}
                      <Link to={`/playlists/${playlist._id}`} className="bookmark-playlist-link">
                        {playlist.title}
                      </Link>
                    </p>
                  )}

                  {/* Playback progress indicator if partially watched */}
                  {!isCompleted && userProgress && userProgress.lastPositionSeconds > 0 && (
                    <div className="bookmark-progress-box">
                      <div className="bookmark-progress-labels">
                        <span>Progress: {userProgress.progressPercentage}%</span>
                        <span>Resume at {formatDuration(userProgress.lastPositionSeconds)}</span>
                      </div>
                      <div className="bookmark-progress-track">
                        <div
                          className="bookmark-progress-fill"
                          style={{ width: `${userProgress.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions: Watch & Remove */}
                <div className="bookmark-actions-row">
                  <Link
                    to={`/videos/${video.slug || video._id}`}
                    className="btn btn-secondary bookmark-watch-btn"
                  >
                    Watch Lesson &rarr;
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleRemoveBookmark(video._id)}
                    disabled={isRemoving}
                    className="btn btn-secondary bookmark-remove-btn"
                    title="Remove from bookmarks"
                    aria-label={`Remove bookmark for ${video.title}`}
                  >
                    {isRemoving ? 'Removing...' : '🗑️ Remove'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export const BookmarksPage = Bookmarks;
export default Bookmarks;
