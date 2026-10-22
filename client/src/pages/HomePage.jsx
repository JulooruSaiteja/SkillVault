import React from 'react';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <section>
      <div className="page-header">
        <h1 className="page-title">Master Core Computing Skills</h1>
        <p className="page-description">
          Curated video learning paths for Computer Science, Software Engineering, Web Development, and Data Science.
        </p>
      </div>

      <div className="grid-cols-3">
        <article className="card">
          <span className="placeholder-badge">Category</span>
          <h2>Web &amp; Full-Stack</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
            MERN stack, React, Node.js, REST APIs, and modern frontend architecture.
          </p>
          <Link to="/categories" className="btn btn-secondary">
            Explore Skills &rarr;
          </Link>
        </article>

        <article className="card">
          <span className="placeholder-badge">Category</span>
          <h2>Data Science &amp; AI</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
            Python, Pandas, SQL, Statistics for Data Science, and Machine Learning essentials.
          </p>
          <Link to="/categories" className="btn btn-secondary">
            Explore Skills &rarr;
          </Link>
        </article>

        <article className="card">
          <span className="placeholder-badge">Category</span>
          <h2>Databases &amp; Systems</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0' }}>
            Relational databases, PostgreSQL, MongoDB, System Design, and Backend Infrastructure.
          </p>
          <Link to="/categories" className="btn btn-secondary">
            Explore Skills &rarr;
          </Link>
        </article>
      </div>
    </section>
  );
}

export default HomePage;
