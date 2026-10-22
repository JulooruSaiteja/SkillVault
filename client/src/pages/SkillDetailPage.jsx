import React from 'react';
import { useParams, Link } from 'react-router-dom';

export function SkillDetailPage() {
  const { skillSlug } = useParams();

  return (
    <section>
      <div className="page-header">
        <span className="placeholder-badge">Phase 6 Placeholder</span>
        <h1 className="page-title">Skill: {skillSlug || 'Details'}</h1>
        <p className="page-description">
          Curated playlists, standalone videos, and AI concept roadmaps for this skill.
        </p>
      </div>

      <div className="card">
        <h3>Playlists &amp; Videos</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: '1rem 0' }}>
          Dynamic playlists and video content for <code>{skillSlug}</code> will be loaded from the catalog API.
        </p>
        <Link to="/playlists/sample-playlist" className="btn btn-secondary">
          Sample Playlist
        </Link>
      </div>
    </section>
  );
}

export default SkillDetailPage;
