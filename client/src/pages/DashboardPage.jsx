import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import '../styles/dashboard.css';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard');
      setData(res?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <section className="dashboard-container">
        <div className="page-header">
          <h1 className="page-title">Learner Dashboard</h1>
          <p className="page-description">Loading your learning history and statistics...</p>
        </div>
        <div className="card dashboard-loading-card">
          <div className="dashboard-spinner" />
          <p className="dashboard-loading-text">Fetching your progress...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-container">
        <div className="page-header">
          <h1 className="page-title">Learner Dashboard</h1>
          <p className="page-description">Overview of your technical tracks and progress.</p>
        </div>
        <div
          role="alert"
          className="card dashboard-error-card"
        >
          <p className="dashboard-error-text">
            {error}
          </p>
          <button type="button" onClick={fetchDashboard} className="btn btn-secondary">
            Retry Loading
          </button>
        </div>
      </section>
    );
  }

  const continueItem = data?.continueLearning;
  const recentItems = data?.recent || [];
  const completedItems = data?.completed || [];
  const playlists = data?.playlists || [];
  const quizStats = data?.quizStats || { totalAttempted: 0, scores: [] };

  const hasAnyActivity =
    Boolean(continueItem) ||
    recentItems.length > 0 ||
    completedItems.length > 0 ||
    playlists.length > 0 ||
    quizStats.totalAttempted > 0;

  return (
    <section className="dashboard-container">
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.name || 'Learner'}</h1>
        <p className="page-description">
          Monitor your computing milestones, resume where you left off, and track practice quiz scores.
        </p>
      </div>

      {/* Metric Summary Cards */}
      <div className="dashboard-metrics-grid">
        <div className="card dashboard-metric-card">
          <div className="dashboard-metric-icon icon-completed">
            ✓
          </div>
          <div>
            <div className="dashboard-metric-value">
              {data?.totalCompleted || completedItems.length}
            </div>
            <div className="dashboard-metric-label">Completed Lessons</div>
          </div>
        </div>

        <div className="card dashboard-metric-card">
          <div className="dashboard-metric-icon icon-playlists">
            📚
          </div>
          <div>
            <div className="dashboard-metric-value">
              {playlists.length}
            </div>
            <div className="dashboard-metric-label">Playlists in Progress</div>
          </div>
        </div>

        <div className="card dashboard-metric-card">
          <div className="dashboard-metric-icon icon-quizzes">
            🧠
          </div>
          <div>
            <div className="dashboard-metric-value">
              {quizStats.totalAttempted}
            </div>
            <div className="dashboard-metric-label">Quizzes Attempted</div>
          </div>
        </div>
      </div>

      {!hasAnyActivity && (
        <div className="card dashboard-empty-card">
          <div className="dashboard-empty-icon">🚀</div>
          <h2 className="dashboard-empty-title">Start Your Learning Journey</h2>
          <p className="dashboard-empty-desc">
            You haven't watched any lessons or attempted any quizzes yet. Explore curated computing skills and technical tracks.
          </p>
          <Link to="/categories" className="btn btn-primary">
            Explore Catalog
          </Link>
        </div>
      )}

      {/* Continue Learning Spotlight Banner */}
      {continueItem && (
        <div className="card dashboard-continue-banner">
          <div className="dashboard-continue-header">
            <div>
              <span className="dashboard-continue-tag">
                Continue Learning
              </span>
              <h2 className="dashboard-continue-title">{continueItem.video?.title}</h2>
              <div className="dashboard-continue-meta">
                {continueItem.video?.skill?.name && (
                  <span>Skill: {continueItem.video.skill.name}</span>
                )}
                {continueItem.video?.playlist?.title && (
                  <span>Playlist: {continueItem.video.playlist.title}</span>
                )}
              </div>
            </div>

            <Link
              to={`/videos/${continueItem.video?.slug || continueItem.video?._id}`}
              className="btn btn-primary dashboard-continue-btn"
            >
              Resume at {formatDuration(continueItem.lastPositionSeconds)}
            </Link>
          </div>

          {/* Progress bar */}
          <div>
            <div className="dashboard-progress-labels">
              <span>{formatDuration(continueItem.lastPositionSeconds)} elapsed</span>
              <span>{continueItem.progressPercentage}% completed</span>
            </div>
            <div className="dashboard-progress-track">
              <div
                className="dashboard-progress-fill"
                style={{ width: `${continueItem.progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Playlists in Progress Section */}
      {playlists.length > 0 && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Playlists in Progress</h2>
            <span className="dashboard-section-subtitle">
              {playlists.length} active {playlists.length === 1 ? 'track' : 'tracks'}
            </span>
          </div>

          <div className="dashboard-playlists-grid">
            {playlists.map((pl) => (
              <div
                key={pl._id}
                className="card dashboard-playlist-card"
              >
                <div>
                  <div className="dashboard-playlist-card-top">
                    <span className="dashboard-skill-pill">
                      {pl.skill?.name || 'Curriculum'}
                    </span>
                    {pl.isFinished && (
                      <span className="dashboard-completed-pill">
                        Completed
                      </span>
                    )}
                  </div>
                  <h3 className="dashboard-playlist-card-title">{pl.title}</h3>
                </div>

                <div className="dashboard-playlist-card-bottom">
                  <div className="dashboard-progress-labels">
                    <span>{pl.completedVideos} of {pl.totalVideos} lessons completed</span>
                    <span className="dashboard-progress-percent">{pl.progressPercentage}%</span>
                  </div>
                  <div className="dashboard-playlist-track">
                    <div
                      className={`dashboard-playlist-fill ${pl.isFinished ? 'is-finished' : ''}`}
                      style={{ width: `${pl.progressPercentage}%` }}
                    />
                  </div>

                  <Link to={`/playlists/${pl.slug || pl._id}`} className="btn btn-secondary dashboard-full-width-btn">
                    View Playlist Curriculum
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Section: Recently Watched & Completed Lessons */}
      <div className="dashboard-two-col-grid">
        {/* Recently Watched Videos */}
        <div className="card">
          <h2 className="dashboard-col-title">Recently Watched</h2>
          {recentItems.length === 0 ? (
            <p className="dashboard-col-empty">
              No videos watched recently.
            </p>
          ) : (
            <div className="dashboard-lessons-list">
              {recentItems.slice(0, 6).map((item) => (
                <div
                  key={item._id}
                  className="dashboard-recent-row"
                >
                  <div className="dashboard-recent-title-row">
                    <Link
                      to={`/videos/${item.video?.slug || item.video?._id}`}
                      className="dashboard-recent-title"
                    >
                      {item.video?.title}
                    </Link>
                    {item.isCompleted && (
                      <span className="dashboard-done-badge">
                        Done
                      </span>
                    )}
                  </div>
                  <div className="dashboard-recent-footer">
                    <span>Position: {formatDuration(item.lastPositionSeconds)} / {formatDuration(item.durationSeconds)}</span>
                    <span>{item.progressPercentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Lessons */}
        <div className="card">
          <div className="dashboard-completed-header">
            <h2 className="dashboard-section-title">Completed Lessons</h2>
            <span className="dashboard-completed-pill">
              {completedItems.length} Finished
            </span>
          </div>

          {completedItems.length === 0 ? (
            <p className="dashboard-col-empty">
              No completed lessons yet. Reach 90% duration on any video to earn completion.
            </p>
          ) : (
            <div className="dashboard-lessons-list">
              {completedItems.slice(0, 6).map((item) => (
                <div
                  key={item._id}
                  className="dashboard-completed-row"
                >
                  <div className="dashboard-completed-info">
                    <Link
                      to={`/videos/${item.video?.slug || item.video?._id}`}
                      className="dashboard-completed-title"
                    >
                      {item.video?.title}
                    </Link>
                    <span className="dashboard-completed-duration">
                      Duration: {formatDuration(item.durationSeconds)}
                    </span>
                  </div>
                  <span className="dashboard-100-badge">
                    100%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quiz Statistics Section (Strictly Limited Scope) */}
      <div className="card">
        <div className="dashboard-quiz-header">
          <div>
            <h2 className="dashboard-quiz-title">Practice Quiz Statistics</h2>
            <p className="dashboard-quiz-desc">
              Summary of all attempted video quizzes and scores out of five marks.
            </p>
          </div>
          <span className="dashboard-quiz-total-badge">
            Total Attempted: {quizStats.totalAttempted}
          </span>
        </div>

        {quizStats.scores.length === 0 ? (
          <div className="dashboard-quiz-empty">
            <p>
              No practice quizzes attempted yet. Generate and take a quiz on any lesson page to test your understanding.
            </p>
          </div>
        ) : (
          <div className="dashboard-lessons-list">
            {quizStats.scores.map((qs) => {
              // Color score based on result
              const scoreClass = qs.score >= 4 ? 'score-high' : qs.score === 3 ? 'score-mid' : 'score-low';

              return (
                <div
                  key={qs._id}
                  className="dashboard-quiz-row"
                >
                  <div className="dashboard-quiz-item-info">
                    <div className="dashboard-quiz-item-title">
                      {qs.videoTitle}
                    </div>
                    <div className="dashboard-quiz-item-date">
                      Attempted on {qs.createdAt ? new Date(qs.createdAt).toLocaleDateString() : 'Recent'}
                    </div>
                  </div>

                  <div className={`dashboard-score-badge ${scoreClass}`}>
                    {qs.scoreDisplay || `${qs.score}/5 marks`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default DashboardPage;
