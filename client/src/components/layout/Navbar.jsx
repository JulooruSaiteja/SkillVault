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
        <div className="brand-logo" aria-label="SkillVault">
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ borderRadius: '6px', flexShrink: 0 }}>
            <rect width="100" height="100" rx="20" fill="#17191B" />
            <rect x="5" y="5" width="90" height="90" rx="16" fill="none" stroke="#B68A55" strokeWidth="3" />
            <path d="M54 16 L26 54 L48 54 L44 84 L74 46 L52 46 Z" fill="#D5AD54" stroke="#F7F7F4" strokeWidth="1.5" />
          </svg>
          <span className="brand-title">SkillVault</span>
        </div>

        <nav aria-label="Main Navigation">
          <ul className="nav-links">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Home
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
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
