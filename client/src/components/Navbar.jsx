import React from 'react';
import { NavLink, Link } from 'react-router-dom';

export function Navbar() {
  return (
    <header className="site-header">
      <div className="navbar-container">
        <Link to="/" className="brand-logo" aria-label="SkillVault Home">
          <span>⚡SkillVault</span>
          <span className="brand-badge">Computing</span>
        </Link>

        <nav aria-label="Main Navigation">
          <ul className="nav-links">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                end
              >
                Explore
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/categories"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Categories
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/search"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Search
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/bookmarks"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Bookmarks
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Dashboard
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="nav-auth">
          <Link to="/login" className="btn btn-secondary">
            Sign In
          </Link>
          <Link to="/signup" className="btn btn-primary">
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
