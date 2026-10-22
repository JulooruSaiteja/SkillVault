import React from 'react';
import { useParams, Link } from 'react-router-dom';

export function PlaylistPage() {
  const { playlistId } = useParams();

  return (
    <section>
      <div className="page-header">
        <span className="placeholder-badge">Phase 8 Placeholder</span>
        <h1 className="page-title">Playlist: {playlistId || 'Curated Series'}</h1>
        <p className="page-description">
          Ordered curriculum with dynamic completion percentage tracking.
        </p>
      </div>

      <div className="card">
        <h3>Playlist Curriculum</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: '1rem 0' }}>
          Constituent videos and aggregate progress for <code>{playlistId}</code> will be displayed here.
        </p>
        <Link to="/videos/sample-video" className="btn btn-primary">
          Start Video &rarr;
        </Link>
      </div>
    </section>
  );
}

export default PlaylistPage;
