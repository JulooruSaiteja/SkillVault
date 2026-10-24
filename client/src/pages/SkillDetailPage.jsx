import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const paddedSecs = secs < 10 ? `0${secs}` : secs;

  if (hrs > 0) {
    const paddedMins = mins < 10 ? `0${mins}` : mins;
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

export function SkillDetailPage() {
  const { skillSlug } = useParams();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchSkill() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/skills/${skillSlug}`);
        if (isMounted) {
          setSkill(res?.data?.skill || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load skill details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (skillSlug) {
      fetchSkill();
    }
    return () => {
      isMounted = false;
    };
  }, [skillSlug]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }} aria-busy="true" aria-live="polite">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading skill details...</p>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <section style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="card">
          <h2 style={{ color: 'var(--color-danger, #f87171)' }}>Skill Not Found</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '1rem 0' }}>
            {error || `We could not find any active computing skill matching "${skillSlug}".`}
          </p>
          <Link to="/categories" className="btn btn-primary">
            &larr; Back to Categories
          </Link>
        </div>
      </section>
    );
  }

  const { playlists = [], videos = [] } = skill;

  return (
    <section>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <ol style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <Link to="/categories" style={{ color: 'var(--color-text-muted)' }}>
              Categories
            </Link>
          </li>
          <li style={{ color: 'var(--color-text-dim)' }} aria-hidden="true">
            /
          </li>
          {skill.category && (
            <>
              <li>
                <Link to="/categories" style={{ color: 'var(--color-text-muted)' }}>
                  {skill.category.name}
                </Link>
              </li>
              <li style={{ color: 'var(--color-text-dim)' }} aria-hidden="true">
                /
              </li>
            </>
          )}
          <li style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{skill.name}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          {skill.icon && <span style={{ fontSize: '2rem', lineHeight: 1 }}>{skill.icon}</span>}
          <h1 className="page-title" style={{ margin: 0 }}>
            {skill.name}
          </h1>
        </div>
        {skill.description && <p className="page-description">{skill.description}</p>}
      </div>

      {/* Playlists Section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>
          Curated Playlists ({playlists.length})
        </h2>

        {playlists.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {playlists.map((playlist) => (
              <div key={playlist._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.5rem 0' }}>{playlist.title}</h3>
                  {playlist.description && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      {playlist.description}
                    </p>
                  )}
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
                  <Link to={`/playlists/${playlist._id}`} className="btn btn-secondary">
                    View Playlist &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '1.5rem', color: 'var(--color-text-muted)' }}>
            <p style={{ margin: 0 }}>No structured playlists created for this skill yet.</p>
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>
          Learning Videos ({videos.length})
        </h2>

        {videos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {videos.map((video, idx) => (
              <div
                key={video._id}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '240px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                      color: 'var(--color-text-dim)',
                      minWidth: '1.5rem'
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.25rem 0' }}>
                      <Link to={`/videos/${video._id}`} style={{ color: 'var(--color-text)' }}>
                        {video.title}
                      </Link>
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>⏱️ {formatDuration(video.durationSeconds)}</span>
                      {video.hasTranscript ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>✓ Transcript Available</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-dim)' }}>Metadata Fallback</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Link to={`/videos/${video._id}`} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
                    Watch Video
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '1.5rem', color: 'var(--color-text-muted)' }}>
            <p style={{ margin: 0 }}>No videos have been added to this skill yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default SkillDetailPage;
