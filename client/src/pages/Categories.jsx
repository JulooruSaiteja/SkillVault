import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Categories.css';

export function Categories() {
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
        <div className="categories-loading" aria-busy="true" aria-live="polite">
          <p className="categories-loading-text">Loading computing catalog...</p>
        </div>
      )}

      {error && (
        <div role="alert" className="categories-error-banner">
          <p className="categories-error-message">{error}</p>
          <button type="button" onClick={fetchCategories} className="btn btn-secondary">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="card categories-empty-state">
          <h3>No Categories Found</h3>
          <p className="categories-empty-desc">
            There are currently no active categories available in the catalog.
          </p>
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="categories-list">
          {categories.map((category) => (
            <article key={category._id || category.slug} className="card category-card">
              <div className="category-header">
                {category.icon && (
                  <span className="category-icon" aria-hidden="true">
                    {category.icon}
                  </span>
                )}
                <h2 className="category-title">{category.name}</h2>
              </div>

              {category.description && (
                <p className="category-description">
                  {category.description}
                </p>
              )}

              <div className="category-skills-section">
                <h3 className="category-skills-heading">
                  Skills in this Domain ({category.skillsCount || category.skills?.length || 0})
                </h3>

                {category.skills && category.skills.length > 0 ? (
                  <div className="category-skills-grid">
                    {category.skills.map((skill) => (
                      <Link
                        key={skill._id || skill.slug}
                        to={`/skills/${skill.slug}`}
                        className="category-skill-card"
                      >
                        <div className="category-skill-header">
                          {skill.icon && <span aria-hidden="true">{skill.icon}</span>}
                          <strong className="category-skill-name">{skill.name}</strong>
                        </div>
                        {skill.description && (
                          <p className="category-skill-desc">
                            {skill.description}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="category-no-skills">
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

export const CategoriesPage = Categories;
export default Categories;
