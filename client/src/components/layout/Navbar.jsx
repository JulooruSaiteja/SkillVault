import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './Navbar.css';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="site-header">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
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
                {user?.role === 'admin' && (
                  <li>
                    <NavLink
                      to="/admin"
                      className={({ isActive }) => `nav-link nav-link-admin ${isActive ? 'active' : ''}`}
                    >
                      Admin
                    </NavLink>
                  </li>
                )}
              </>
            )}
          </ul>
        </nav>

        <div className="nav-auth">
          {isAuthenticated ? (
            <div className="nav-auth-user">
              <Link
                to="/profile"
                className="btn btn-secondary nav-profile-btn"
                title="View Profile"
              >
                <span>👤</span>
                <span>{user?.name?.split(' ')[0] || 'Profile'}</span>
                {user?.role === 'admin' && (
                  <span className="nav-admin-badge">
                    ADMIN
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-secondary nav-logout-btn"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="nav-auth-guest">
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
