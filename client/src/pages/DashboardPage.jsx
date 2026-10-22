import React from 'react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  return (
    <section>
      <div className="page-header">
        <span className="placeholder-badge">Phase 16 Placeholder</span>
        <h1 className="page-title">Learner Dashboard</h1>
        <p className="page-description">
          Overview of your continue-learning queue, completed videos, playlist milestones, and quiz mastery.
        </p>
      </div>

      <div className="grid-cols-3">
        <div className="card">
          <h3>Continue Learning</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
            Resume where you left off across your active videos.
          </p>
        </div>

        <div className="card">
          <h3>Playlists in Progress</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
            Track percentage completion across active technical tracks.
          </p>
        </div>

        <div className="card">
          <h3>Quiz Performance</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
            Review scored attempts and conceptual weak topics.
          </p>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
