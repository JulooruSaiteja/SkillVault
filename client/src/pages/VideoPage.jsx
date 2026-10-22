import React from 'react';
import { useParams } from 'react-router-dom';

export function VideoPage() {
  const { videoId } = useParams();

  return (
    <section>
      <div className="page-header">
        <span className="placeholder-badge">Phase 9 Placeholder</span>
        <h1 className="page-title">Video: {videoId || 'Lesson'}</h1>
        <p className="page-description">
          Unified YouTube video player with progress tracking, AI notes, quizzes, and bookmarks.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>YouTube Embedded Player Area</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: '1rem 0' }}>
          Video player for <code>{videoId}</code> with automated progress checkpointing (Phase 9 &amp; 10).
        </p>
      </div>

      <div className="grid-cols-3">
        <div className="card">
          <h4>AI Grounded Notes</h4>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', margin: '0.5rem 0' }}>
            Structured summaries from transcripts (Phase 13).
          </p>
        </div>
        <div className="card">
          <h4>AI Quiz</h4>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', margin: '0.5rem 0' }}>
            Test conceptual retention (Phase 14).
          </p>
        </div>
        <div className="card">
          <h4>Bookmark</h4>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', margin: '0.5rem 0' }}>
            Save to personal list (Phase 11).
          </p>
        </div>
      </div>
    </section>
  );
}

export default VideoPage;
