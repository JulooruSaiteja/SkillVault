import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import './Profile.css';

export function Profile() {
  const { user, updateProfile, changePassword } = useAuth();

  // Name update state
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setNameSuccess('');
    setNameError('');

    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameError('Name must be at least 2 characters long.');
      return;
    }
    if (trimmed.length > 50) {
      setNameError('Name cannot exceed 50 characters.');
      return;
    }

    setSavingName(true);
    try {
      await updateProfile(trimmed);
      setNameSuccess('Profile name updated successfully.');
    } catch (err) {
      setNameError(err.message || 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="profile-container">
      <div className="page-header">
        <h1 className="page-title">Account Profile</h1>
        <p className="page-description">Manage your SkillVault learner credentials and security settings.</p>
      </div>

      <div className="profile-stack">
        {/* Account Details Card */}
        <div className="card profile-details-card">
          <div className="profile-user-header">
            <div className="profile-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="profile-user-info">
              <h2 className="profile-user-name">{user?.name || 'Learner'}</h2>
              <div className="profile-role-row">
                <span className={`profile-role-badge ${user?.role === 'admin' ? 'is-admin' : ''}`}>
                  {user?.role || 'learner'}
                </span>
                <span className="profile-role-immutable">
                  (Role cannot be changed)
                </span>
              </div>
            </div>
          </div>

          <div className="profile-meta-grid">
            <div>
              <label className="profile-field-label">
                Email Address
              </label>
              <p className="profile-field-value">{user?.email || 'N/A'}</p>
            </div>

            <div>
              <label className="profile-field-label">
                Account Status
              </label>
              <p className={`profile-field-value ${user?.isActive ? 'profile-status-active' : 'profile-status-inactive'}`}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>

            <div>
              <label className="profile-field-label">
                Account ID
              </label>
              <p className="profile-field-id">
                {user?.id || user?._id || 'N/A'}
              </p>
            </div>

            <div>
              <label className="profile-field-label">
                Member Since
              </label>
              <p className="profile-field-muted">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recent'}
              </p>
            </div>
          </div>
        </div>

        {/* Update Profile Name Card */}
        <div className="card">
          <h3 className="profile-card-title">Edit Display Name</h3>
          <p className="profile-card-desc">
            Update the name shown across your SkillVault certificates, dashboard, and navigation.
          </p>

          {nameSuccess && (
            <div role="alert" className="profile-alert-success">
              {nameSuccess}
            </div>
          )}

          {nameError && (
            <div role="alert" className="profile-alert-error">
              {nameError}
            </div>
          )}

          <form onSubmit={handleUpdateName} className="profile-form">
            <div>
              <label
                htmlFor="profile-name-input"
                className="profile-input-label"
              >
                Full Name
              </label>
              <input
                id="profile-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="profile-input"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={savingName || name.trim() === user?.name}
                className="btn btn-primary profile-btn"
              >
                {savingName ? 'Saving Changes...' : 'Save Name Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <h3 className="profile-card-title">Change Password</h3>
          <p className="profile-card-desc">
            Verify your current password to choose a new secure password (minimum 6 characters).
          </p>

          {passwordSuccess && (
            <div role="alert" className="profile-alert-success">
              {passwordSuccess}
            </div>
          )}

          {passwordError && (
            <div role="alert" className="profile-alert-error">
              {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="profile-form">
            <div>
              <label
                htmlFor="current-password-input"
                className="profile-input-label"
              >
                Current Password
              </label>
              <input
                id="current-password-input"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="profile-input"
              />
            </div>

            <div className="profile-password-grid">
              <div>
                <label
                  htmlFor="new-password-input"
                  className="profile-input-label"
                >
                  New Password
                </label>
                <input
                  id="new-password-input"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="profile-input"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password-input"
                  className="profile-input-label"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password-input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="profile-input"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={savingPassword}
                className="btn btn-primary profile-btn"
              >
                {savingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export const ProfilePage = Profile;
export default Profile;
