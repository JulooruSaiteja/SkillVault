import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

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

export function PlaylistPage() {
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
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }} aria-busy="true" aria-live="polite">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading playlist curriculum...</p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <section>
        <div
          role="alert"
          style={{
            maxWidth: '600px',
            margin: '3rem auto',
            padding: '1.5rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            textAlign: 'center'
          }}
        >
          <h2 style={{ fontSize: '1.25rem', color: '#f87171', marginBottom: '0.75rem' }}>Playlist Unavailable</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            {error || 'The requested playlist could not be found or has been deactivated.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
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
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <ol style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap' }}>
          <li>
            <Link to="/categories" style={{ color: 'var(--color-text-muted)' }}>
              Categories
            </Link>
          </li>
          {category && (
            <>
              <li style={{ color: 'var(--color-text-dim)' }} aria-hidden="true">/</li>
              <li>
                <Link to="/categories" style={{ color: 'var(--color-text-muted)' }}>
                  {category.name}
                </Link>
              </li>
            </>
          )}
          {skill && (
            <>
              <li style={{ color: 'var(--color-text-dim)' }} aria-hidden="true">/</li>
              <li>
                <Link to={`/skills/${skill.slug}`} style={{ color: 'var(--color-text-muted)' }}>
                  {skill.name}
                </Link>
              </li>
            </>
          )}
          <li style={{ color: 'var(--color-text-dim)' }} aria-hidden="true">/</li>
          <li style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{playlist.title}</li>
        </ol>
      </nav>

      {/* Playlist Header Card */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-warning)',
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            Curated Playlist
          </span>
          {skill && (
            <Link
              to={`/skills/${skill.slug}`}
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {skill.icon && <span style={{ marginRight: '0.3rem' }}>{skill.icon}</span>}
              {skill.name}
            </Link>
          )}
          {playlist.externalYoutubePlaylistId && (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-dim)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              ID: {playlist.externalYoutubePlaylistId}
            </span>
          )}
        </div>

        <h1 className="page-title" style={{ fontSize: '1.85rem', margin: '0 0 0.75rem 0' }}>
          {playlist.title}
        </h1>

        {playlist.description && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', maxWidth: '850px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {playlist.description}
          </p>
        )}

        {/* Dynamic Progress Display */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Playlist Progress</span>
              {stats?.isCompleted && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--color-success)',
                    backgroundColor: 'rgba(52, 211, 153, 0.15)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  ✓ Completed
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>
                {completedCount} of {totalCount} completed ({progressPct}%)
              </span>
              {totalDuration > 0 && (
                <span style={{ color: 'var(--color-text-dim)' }}>
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
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                backgroundColor: progressPct === 100 ? 'var(--color-success)' : 'var(--color-primary)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>

          {!isAuthenticated && (
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', marginTop: '0.75rem', margin: '0.75rem 0 0 0' }}>
              <Link to="/login" style={{ color: 'var(--color-primary)' }}>Sign in</Link> to automatically save video progress and track your curriculum completion.
            </p>
          )}
        </div>
      </div>

      {/* Constituent Videos Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.35rem', margin: 0 }}>
            Curriculum Lessons ({videos.length})
          </h2>
          {videos.length > 0 && (
            <Link
              to={`/videos/${videos[0]._id}`}
              className="btn btn-primary"
              style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}
            >
              Start Course &rarr;
            </Link>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-text-muted)' }}>
            <p style={{ margin: 0 }}>No videos have been added to this playlist yet.</p>
            {skill && (
              <Link to={`/skills/${skill.slug}`} className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                Back to {skill.name}
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {videos.map((video, idx) => (
              <article
                key={video._id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.15rem 1.5rem',
                  gap: '1.25rem',
                  flexWrap: 'wrap',
                  backgroundColor: video.isCompleted ? 'rgba(52, 211, 153, 0.03)' : 'var(--color-surface)',
                  borderColor: video.isCompleted ? 'rgba(52, 211, 153, 0.25)' : 'var(--color-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: '1', minWidth: '260px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: video.isCompleted ? 'var(--color-success)' : 'var(--color-text-dim)',
                      minWidth: '2rem'
                    }}
                  >
                    #{idx + 1}
                  </span>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.35rem 0' }}>
                      <Link to={`/videos/${video._id}`} style={{ color: 'var(--color-text)' }}>
                        {video.title}
                      </Link>
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
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

                      {video.isCompleted && (
                        <span
                          style={{
                            color: 'var(--color-success)',
                            fontWeight: 600,
                            backgroundColor: 'rgba(52, 211, 153, 0.1)',
                            padding: '0.1rem 0.45rem',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Link
                    to={`/videos/${video._id}`}
                    className={`btn ${video.isCompleted ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
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

export default PlaylistPage;
