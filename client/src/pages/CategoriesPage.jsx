import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/categories?includeSkills=true');
      setCategories(res?.data?.categories || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <section>
      <div className="page-header">
        <h1 className="page-title">Computing Categories</h1>
        <p className="page-description">
          Browse curated computing domains, specialized software skills, and structured learning tracks.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }} aria-busy="true" aria-live="polite">
          <p style={{ color: 'var(--color-text-muted)' }}>Loading computing catalog...</p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            maxWidth: '600px',
            margin: '2rem auto',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            textAlign: 'center'
          }}
        >
          <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>
          <button type="button" onClick={fetchCategories} className="btn btn-secondary">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', maxWidth: '600px', margin: '2rem auto' }}>
          <h3>No Categories Found</h3>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            There are currently no active categories available in the catalog.
          </p>
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {categories.map((category) => (
            <article key={category._id || category.slug} className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {category.icon && (
                  <span style={{ fontSize: '1.75rem', lineHeight: 1 }} aria-hidden="true">
                    {category.icon}
                  </span>
                )}
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{category.name}</h2>
              </div>

              {category.description && (
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem', maxWidth: '800px' }}>
                  {category.description}
                </p>
              )}

              <div style={{ marginTop: '1rem' }}>
                <h3
                  style={{
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-text-dim)',
                    marginBottom: '0.75rem'
                  }}
                >
                  Skills in this Domain ({category.skillsCount || category.skills?.length || 0})
                </h3>

                {category.skills && category.skills.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {category.skills.map((skill) => (
                      <Link
                        key={skill._id || skill.slug}
                        to={`/skills/${skill.slug}`}
                        style={{
                          display: 'block',
                          padding: '1rem',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          textDecoration: 'none',
                          color: 'var(--color-text)',
                          transition: 'border-color 0.15s, background-color 0.15s, transform 0.1s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          {skill.icon && <span aria-hidden="true">{skill.icon}</span>}
                          <strong style={{ color: 'var(--color-primary)' }}>{skill.name}</strong>
                        </div>
                        {skill.description && (
                          <p
                            style={{
                              fontSize: '0.85rem',
                              color: 'var(--color-text-muted)',
                              margin: 0,
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {skill.description}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No active skills currently listed under this category.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default CategoriesPage;
