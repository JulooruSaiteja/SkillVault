import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import './SkillDetail.css';

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

export function SkillDetail() {
  const { skillSlug } = useParams();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSkill = useCallback(async () => {
    if (!skillSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/skills/${skillSlug}`);
      setSkill(res?.data?.skill || null);
    } catch (err) {
      setError(err.message || 'Failed to load skill details.');
    } finally {
      setLoading(false);
    }
  }, [skillSlug]);

  useEffect(() => {
    fetchSkill();
  }, [fetchSkill]);

  if (loading) {
    return (
      <div className="skill-loading" aria-busy="true" aria-live="polite">
        <p className="skill-loading-text">Loading skill details...</p>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <section className="skill-not-found-container">
        <div className="card">
          <h2 className="skill-not-found-title">Skill Not Found</h2>
          <p className="skill-not-found-msg">
            {error || `We could not find any active computing skill matching "${skillSlug}".`}
          </p>
          <div className="skill-not-found-actions">
            {error && (
              <button type="button" onClick={fetchSkill} className="btn btn-secondary">
                Retry
              </button>
            )}
            <Link to="/categories" className="btn btn-primary">
              &larr; Back to Categories
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const { playlists = [], videos = [] } = skill;

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
          <li className="breadcrumb-separator" aria-hidden="true">
            /
          </li>
          {skill.category && (
            <>
              <li>
                <Link to="/categories" className="breadcrumb-link">
                  {skill.category.name}
                </Link>
              </li>
              <li className="breadcrumb-separator" aria-hidden="true">
                /
              </li>
            </>
          )}
          <li className="breadcrumb-current">{skill.name}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="page-header skill-header">
        <div className="skill-title-row">
          {skill.icon && <span className="skill-title-icon">{skill.icon}</span>}
          <h1 className="page-title skill-title-text">
            {skill.name}
          </h1>
        </div>
        {skill.description && <p className="page-description">{skill.description}</p>}
      </div>

      {/* Playlists Section */}
      <div className="skill-section">
        <h2 className="skill-section-title">
          Curated Playlists ({playlists.length})
        </h2>

        {playlists.length > 0 ? (
          <div className="skill-playlists-grid">
            {playlists.map((playlist) => (
              <div key={playlist._id} className="card skill-playlist-card">
                <div>
                  <h3 className="skill-playlist-card-title">{playlist.title}</h3>
                  {playlist.description && (
                    <p className="skill-playlist-card-desc">
                      {playlist.description}
                    </p>
                  )}
                </div>
                <div className="skill-playlist-card-action">
                  <Link to={`/playlists/${playlist._id}`} className="btn btn-secondary">
                    View Playlist &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card skill-empty-card">
            <p className="skill-empty-text">No structured playlists created for this skill yet.</p>
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div>
        <h2 className="skill-section-title">
          Learning Videos ({videos.length})
        </h2>

        {videos.length > 0 ? (
          <div className="skill-videos-list">
            {videos.map((video, idx) => (
              <div
                key={video._id}
                className="card skill-video-row"
              >
                <div className="skill-video-meta">
                  <span className="skill-video-index">
                    #{idx + 1}
                  </span>
                  <div>
                    <h3 className="skill-video-title">
                      <Link to={`/videos/${video._id}`} className="skill-video-link">
                        {video.title}
                      </Link>
                    </h3>
                    <div className="skill-video-details">
                      <span className="skill-video-duration">⏱️ {formatDuration(video.durationSeconds)}</span>
                      {video.hasTranscript ? (
                        <span className="skill-video-transcript-badge">✓ Transcript Available</span>
                      ) : (
                        <span className="skill-video-fallback-badge">Metadata Fallback</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Link to={`/videos/${video._id}`} className="btn btn-primary skill-video-btn">
                    Watch Video
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card skill-empty-card">
            <p className="skill-empty-text">No videos have been added to this skill yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export const SkillDetailPage = SkillDetail;
export default SkillDetail;
