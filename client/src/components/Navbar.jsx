import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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
            {isAuthenticated && (
              <>
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
              </>
            )}
          </ul>
        </nav>

        <div className="nav-auth">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                to="/profile"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem' }}
                title="View Profile"
              >
                <span>👤</span>
                <span>{user?.name?.split(' ')[0] || 'Profile'}</span>
                {user?.role === 'admin' && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      padding: '0.1rem 0.35rem',
                      borderRadius: 'var(--radius-sm, 4px)',
                      fontWeight: 'bold'
                    }}
                  >
                    ADMIN
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary">
                Sign In
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
