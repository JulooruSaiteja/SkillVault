import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export function HomePage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadFeaturedCatalog() {
      try {
        const res = await api.get('/categories?includeSkills=true');
        if (isMounted && res?.data?.categories) {
          setCategories(res.data.categories);
        }
      } catch {
        // Fallback gracefully on homepage if API is temporarily unavailable
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadFeaturedCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section>
      <div className="page-header">
        <h1 className="page-title">Master Core Computing Skills</h1>
        <p className="page-description">
          Curated video learning tracks for Computer Science, Software Engineering, Web Development, and Data Systems.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }} aria-busy="true">
          <p style={{ color: 'var(--color-text-muted)' }}>Loading computing domains...</p>
        </div>
      ) : categories.length > 0 ? (
        <div className="grid-cols-3">
          {categories.map((cat) => (
            <article key={cat._id || cat.slug} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {cat.icon && <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>}
                  <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{cat.name}</h2>
                </div>
                <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0 1rem 0', fontSize: '0.9rem' }}>
                  {cat.description}
                </p>

                {cat.skills && cat.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                    {cat.skills.slice(0, 3).map((skill) => (
                      <Link
                        key={skill._id || skill.slug}
                        to={`/skills/${skill.slug}`}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-primary)',
                          textDecoration: 'none'
                        }}
                      >
                        {skill.name}
                      </Link>
                    ))}
                    {cat.skills.length > 3 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', alignSelf: 'center' }}>
                        +{cat.skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Link to="/categories" className="btn btn-secondary" style={{ width: '100%' }}>
                  Explore Domain &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid-cols-3">
          <article className="card">
            <h2>Computer Science</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
              Algorithms, data structures, and computer architecture.
            </p>
            <Link to="/categories" className="btn btn-secondary">
              Browse Categories &rarr;
            </Link>
          </article>
          <article className="card">
            <h2>Web Development</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
              React, Node.js, databases, and full-stack software development.
            </p>
            <Link to="/categories" className="btn btn-secondary">
              Browse Categories &rarr;
            </Link>
          </article>
          <article className="card">
            <h2>Data &amp; Databases</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
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

export default HomePage;
