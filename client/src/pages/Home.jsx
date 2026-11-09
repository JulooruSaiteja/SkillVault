import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Home.css';

export function Home() {
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ categories: 0, skills: 0, playlists: 0, videos: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCatalogData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, statsRes] = await Promise.allSettled([
        api.get('/categories?includeSkills=true'),
        api.get('/categories/stats')
      ]);

      let loadedCategories = [];
      if (catRes.status === 'fulfilled' && catRes.value?.data?.categories) {
        loadedCategories = catRes.value.data.categories;
        setCategories(loadedCategories);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.stats) {
        setStats(statsRes.value.data.stats);
      } else {
        // Fallback computation from loaded categories if dedicated stats endpoint is pending
        const totalSkills = loadedCategories.reduce((acc, cat) => acc + (cat.skills?.length || cat.skillsCount || 0), 0);
        setStats({
          categories: loadedCategories.length,
          skills: totalSkills,
          playlists: 0,
          videos: 0
        });
      }
    } catch (err) {
      setError(err.message || 'Unable to load learning catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  return (
    <section className="home-page-container">
      {/* Blackboard Classroom Hero – Introduction & Purpose */}
      <div className="home-hero">
        <div className="home-chalk-tag">
          <span className="home-chalk-tag-icon">✎</span>
          <span>SkillVault — Your Digital Classroom for Computing &amp; Technology</span>
        </div>

        <h1 className="home-hero-title">
          A Structured Space to Explore, Learn, and Develop Technical Skills
        </h1>

        <p className="home-hero-subtitle">
          SkillVault is a centralized learning environment designed for computing students.
          Explore essential technical subjects, follow curated video lessons, strengthen your
          understanding with organized study notes, and evaluate your knowledge through
          interactive practice quizzes. Everything comes together in one structured space
          to support continuous technical learning.
        </p>

        {/* Read-Only Platform Statistics Overview */}
        <div className="home-stats-board">
          <div className="home-stats-board-header">
            <span className="home-stats-board-label">Your Learning Environment</span>
            <span className="home-stats-board-status">● Live Catalog</span>
          </div>

          <div className="home-stats-grid">
            <div className="home-stat-card">
              <span className="home-stat-icon">📚</span>
              <div className="home-stat-content">
                <span className="home-stat-number">{stats.categories || categories.length || '—'}</span>
                <span className="home-stat-name">Computing Domains</span>
              </div>
            </div>

            <div className="home-stat-card">
              <span className="home-stat-icon">🎯</span>
              <div className="home-stat-content">
                <span className="home-stat-number">{stats.skills || categories.reduce((sum, c) => sum + (c.skills?.length || 0), 0) || '—'}</span>
                <span className="home-stat-name">Specialized Skills</span>
              </div>
            </div>

            <div className="home-stat-card">
              <span className="home-stat-icon">📑</span>
              <div className="home-stat-content">
                <span className="home-stat-number">{stats.playlists || 'Curated'}</span>
                <span className="home-stat-name">Learning Playlists</span>
              </div>
            </div>

            <div className="home-stat-card">
              <span className="home-stat-icon">🎬</span>
              <div className="home-stat-content">
                <span className="home-stat-number">{stats.videos || '—'}</span>
                <span className="home-stat-name">Video Lessons</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Platform Features */}
        <div className="home-hero-highlights">
          <div className="home-highlight-item">
            <span className="home-highlight-icon">📓</span>
            <div>
              <strong>Structured Study Notes</strong>
              <p>
                Explore organized, notebook-inspired study material containing key definitions,
                important concepts, detailed explanations, and essential takeaways. Use these
                notes to revise lessons, revisit difficult topics, and strengthen your
                conceptual understanding.
              </p>
            </div>
          </div>

          <div className="home-highlight-item">
            <span className="home-highlight-icon">✏️</span>
            <div>
              <strong>Interactive Practice &amp; Assessment</strong>
              <p>
                Put your knowledge into practice through topic-based quizzes. Receive instant
                evaluation, review your results, identify knowledge gaps, and understand
                incorrect answers through step-by-step explanations.
              </p>
            </div>
          </div>

          <div className="home-highlight-item">
            <span className="home-highlight-icon">📌</span>
            <div>
              <strong>Personal Learning Library</strong>
              <p>
                Keep useful learning resources within reach. Bookmark important video lessons,
                save topics for revision, and return to previously selected materials whenever
                you need to continue your learning.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="home-loading" aria-busy="true" aria-live="polite">
          <div className="home-loading-spinner" />
          <p className="home-loading-text">Preparing your learning catalog...</p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div role="alert" className="home-error-banner">
          <p className="home-error-message">{error}</p>
          <button type="button" onClick={loadCatalogData} className="btn btn-secondary">
            Retry Loading
          </button>
        </div>
      )}

      {/* Preview of Available Subject Domains */}
      {!loading && categories.length > 0 && (
        <div className="home-section">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">Explore the Computing Landscape</h2>
              <p className="home-section-desc">
                Discover the technical disciplines available on SkillVault. Explore organized
                subject domains covering programming, software development, databases, and
                data analytics. Each category introduces a focused area of learning and
                provides a starting point for exploring its associated technical skills.
                Select a domain to discover its full collection of subjects in Categories.
              </p>
            </div>
          </div>

          <div className="grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat._id || cat.slug}
                to="/categories"
                className="card home-category-preview-card"
                title={`Explore ${cat.name} in Categories`}
              >
                <div className="home-category-content">
                  <div className="home-category-header">
                    {cat.icon && <span className="home-category-icon">{cat.icon}</span>}
                    <h3 className="home-category-name">{cat.name}</h3>
                  </div>
                  <p className="home-category-desc">
                    {cat.description}
                  </p>
                </div>

                <div className="home-preview-meta">
                  <span className="home-preview-count">
                    {cat.skills?.length || cat.skillsCount || 0} Specialized Skills
                  </span>
                  <span className="home-preview-arrow">
                    Explore Domain &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Fallback Static Preview Cards when Database Has No Categories */}
      {!loading && categories.length === 0 && !error && (
        <div className="home-section">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">Explore the Computing Landscape</h2>
              <p className="home-section-desc">
                Get an introduction to the major areas of computing represented in SkillVault.
                Explore foundational computer science concepts, modern web engineering, and
                data technologies. Visit Categories to discover the available learning paths
                and associated technical subjects.
              </p>
            </div>
          </div>

          <div className="grid-cols-3">
            <Link to="/categories" className="card home-category-preview-card">
              <div className="home-category-content">
                <div className="home-category-header">
                  <span className="home-category-icon">💻</span>
                  <h3 className="home-category-name">Computer Science</h3>
                </div>
                <p className="home-fallback-desc">
                  Build a strong foundation in computer science through programming,
                  algorithms, data structures, problem-solving techniques, and the
                  fundamental principles behind modern computing systems.
                </p>
              </div>
              <div className="home-preview-meta">
                <span className="home-preview-count">Programming &amp; Core Concepts</span>
                <span className="home-preview-arrow">Explore Domain &rarr;</span>
              </div>
            </Link>

            <Link to="/categories" className="card home-category-preview-card">
              <div className="home-category-content">
                <div className="home-category-header">
                  <span className="home-category-icon">🌐</span>
                  <h3 className="home-category-name">Web Development</h3>
                </div>
                <p className="home-fallback-desc">
                  Explore modern web technologies, frontend development, React,
                  server-side programming with Node.js, backend concepts, and the
                  foundations of building complete web applications.
                </p>
              </div>
              <div className="home-preview-meta">
                <span className="home-preview-count">Frontend &amp; Backend Engineering</span>
                <span className="home-preview-arrow">Explore Domain &rarr;</span>
              </div>
            </Link>

            <Link to="/categories" className="card home-category-preview-card">
              <div className="home-category-content">
                <div className="home-category-header">
                  <span className="home-category-icon">🗄️</span>
                  <h3 className="home-category-name">Data &amp; Databases</h3>
                </div>
                <p className="home-fallback-desc">
                  Develop an understanding of SQL, relational databases, data organization,
                  analytical techniques, query operations, and the technologies used to
                  transform raw data into meaningful information.
                </p>
              </div>
              <div className="home-preview-meta">
                <span className="home-preview-count">Database &amp; Data Analytics</span>
                <span className="home-preview-arrow">Explore Domain &rarr;</span>
              </div>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

export const HomePage = Home;
export default Home;
