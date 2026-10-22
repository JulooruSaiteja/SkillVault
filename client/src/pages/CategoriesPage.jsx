import React from 'react';
import { Link } from 'react-router-dom';

export function CategoriesPage() {
  return (
    <section>
      <div className="page-header">
        <h1 className="page-title">Computing Categories</h1>
        <p className="page-description">Browse curated categories and their specialized computing skills.</p>
      </div>

      <div className="grid-cols-3">
        <div className="card">
          <span className="placeholder-badge">Phase 6 Placeholder</span>
          <h2>Computer Science Fundamentals</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
            Data structures, algorithms, operating systems, and computer architecture.
          </p>
          <Link to="/skills/algorithms" className="btn btn-secondary">
            View Skills
          </Link>
        </div>

        <div className="card">
          <span className="placeholder-badge">Phase 6 Placeholder</span>
          <h2>Programming Languages</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
            Python, JavaScript, C++, Go, and Rust.
          </p>
          <Link to="/skills/javascript" className="btn btn-secondary">
            View Skills
          </Link>
        </div>

        <div className="card">
          <span className="placeholder-badge">Phase 6 Placeholder</span>
          <h2>Data Analysis &amp; Engineering</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
            SQL, Excel, ETL pipelines, Pandas, and data warehousing.
          </p>
          <Link to="/skills/sql" className="btn btn-secondary">
            View Skills
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CategoriesPage;
