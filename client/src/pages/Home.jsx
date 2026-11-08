import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Home.css';

export function Home() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFeaturedCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/categories?includeSkills=true');
      if (res?.data?.categories) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      setError(err.message || 'Unable to load featured computing catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeaturedCatalog();
  }, [loadFeaturedCatalog]);

  return (
    <section>
      <div className="page-header">
        <h1 className="page-title">Master Core Computing Skills</h1>
        <p className="page-description">
          Curated video learning tracks for Computer Science, Software Engineering, Web Development, and Data Systems.
        </p>
      </div>

      {loading && (
        <div className="home-loading" aria-busy="true" aria-live="polite">
          <p className="home-loading-text">Loading computing domains...</p>
        </div>
      )}

      {error && (
        <div role="alert" className="home-error-banner">
          <p className="home-error-message">{error}</p>
          <button type="button" onClick={loadFeaturedCatalog} className="btn btn-secondary">
            Retry Loading
          </button>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="grid-cols-3">
          {categories.map((cat) => (
            <article key={cat._id || cat.slug} className="card home-category-card">
              <div>
                <div className="home-category-header">
                  {cat.icon && <span className="home-category-icon">{cat.icon}</span>}
                  <h2 className="home-category-name">{cat.name}</h2>
                </div>
                <p className="home-category-desc">
                  {cat.description}
                </p>

                {cat.skills && cat.skills.length > 0 && (
                  <div className="home-skills-list">
                    {cat.skills.slice(0, 3).map((skill) => (
                      <Link
                        key={skill._id || skill.slug}
                        to={`/skills/${skill.slug}`}
                        className="home-skill-tag"
                      >
                        {skill.name}
                      </Link>
                    ))}
                    {cat.skills.length > 3 && (
                      <span className="home-more-skills">
                        +{cat.skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Link to="/categories" className="btn btn-secondary home-card-btn">
                  Explore Domain &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && categories.length === 0 && !error && (
        <div className="grid-cols-3">
          <article className="card">
            <h2>Computer Science</h2>
            <p className="home-fallback-desc">
              Algorithms, data structures, and computer architecture.
            </p>
            <Link to="/categories" className="btn btn-secondary">
              Browse Categories &rarr;
            </Link>
          </article>
          <article className="card">
            <h2>Web Development</h2>
            <p className="home-fallback-desc">
              React, Node.js, databases, and full-stack software development.
            </p>
            <Link to="/categories" className="btn btn-secondary">
              Browse Categories &rarr;
            </Link>
          </article>
          <article className="card">
            <h2>Data &amp; Databases</h2>
            <p className="home-fallback-desc">
              SQL, schema design, data pipelines, and analytical engineering.
            </p>
            <Link to="/categories" className="btn btn-secondary">
              Browse Categories &rarr;
            </Link>
          </article>
        </div>
      )}
    </section>
  );
}

export const HomePage = Home;
export default Home;
