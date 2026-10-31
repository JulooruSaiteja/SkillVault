import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import '../styles/admin.css';

export function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Overview Data
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Entities Data
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [videos, setVideos] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal / Form States
  const [modalType, setModalType] = useState(null); // 'category' | 'skill' | 'playlist' | 'video' | 'transcript'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Clear feedback after 6 seconds
  useEffect(() => {
    if (feedback.message) {
      const timer = setTimeout(() => setFeedback({ type: '', message: '' }), 6000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Keyboard escape listener to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalType) {
        closeModal();
      }
    };
    if (modalType) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalType]);

  // Load Admin Overview Stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/admin/stats');
      setStats(res?.data?.stats || null);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load system stats' });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        await fetchStats();
      } else if (activeTab === 'categories') {
        const res = await api.get('/admin/categories');
        setCategories(res?.data?.categories || []);
      } else if (activeTab === 'skills') {
        const [skillsRes, catsRes] = await Promise.all([
          api.get('/admin/skills'),
          api.get('/admin/categories')
        ]);
        setSkills(skillsRes?.data?.skills || []);
        setCategories(catsRes?.data?.categories || []);
      } else if (activeTab === 'playlists') {
        const [plRes, skillsRes] = await Promise.all([
          api.get('/admin/playlists'),
          api.get('/admin/skills')
        ]);
        setPlaylists(plRes?.data?.playlists || []);
        setSkills(skillsRes?.data?.skills || []);
      } else if (activeTab === 'videos') {
        const [vidRes, skillsRes, plRes] = await Promise.all([
          api.get('/admin/videos'),
          api.get('/admin/skills'),
          api.get('/admin/playlists')
        ]);
        setVideos(vidRes?.data?.videos || []);
        setSkills(skillsRes?.data?.skills || []);
        setPlaylists(plRes?.data?.playlists || []);
      } else if (activeTab === 'users') {
        const res = await api.get('/admin/users');
        setUsers(res?.data?.users || []);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch administration data' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Form Modal helper
  const openCreateModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    if (type === 'category') {
      setFormData({ name: '', description: '', icon: '', order: 0, isActive: true });
    } else if (type === 'skill') {
      setFormData({
        name: '',
        description: '',
        category: categories[0]?._id || '',
        icon: '',
        order: 0,
        isActive: true
      });
    } else if (type === 'playlist') {
      setFormData({
        title: '',
        description: '',
        skill: skills[0]?._id || '',
        externalYoutubePlaylistId: '',
        order: 0,
        isActive: true
      });
    } else if (type === 'video') {
      setFormData({
        title: '',
        description: '',
        youtubeVideoId: '',
        durationSeconds: 600,
        skill: skills[0]?._id || '',
        playlist: '',
        transcript: '',
        order: 0,
        isActive: true
      });
    }
  };

  const openEditModal = (type, item) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'category') {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        icon: item.icon || '',
        order: item.order || 0,
        isActive: item.isActive !== false
      });
    } else if (type === 'skill') {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category: item.category?._id || item.category || '',
        icon: item.icon || '',
        order: item.order || 0,
        isActive: item.isActive !== false
      });
    } else if (type === 'playlist') {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        skill: item.skill?._id || item.skill || '',
        externalYoutubePlaylistId: item.externalYoutubePlaylistId || '',
        order: item.order || 0,
        isActive: item.isActive !== false
      });
    } else if (type === 'video') {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        youtubeVideoId: item.youtubeVideoId || '',
        durationSeconds: item.durationSeconds || 0,
        skill: item.skill?._id || item.skill || '',
        playlist: item.playlist?._id || item.playlist || '',
        transcript: item.transcript || '',
        order: item.order || 0,
        isActive: item.isActive !== false
      });
    } else if (type === 'transcript') {
      setFormData({
        transcript: item.transcript || ''
      });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  // Submit Modal Form (Create / Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      if (modalType === 'category') {
        if (editingItem) {
          await api.patch(`/admin/categories/${editingItem._id}`, formData);
          setFeedback({ type: 'success', message: 'Category updated successfully.' });
        } else {
          await api.post('/admin/categories', formData);
          setFeedback({ type: 'success', message: 'Category created successfully.' });
        }
      } else if (modalType === 'skill') {
        if (editingItem) {
          await api.patch(`/admin/skills/${editingItem._id}`, formData);
          setFeedback({ type: 'success', message: 'Skill updated successfully.' });
        } else {
          await api.post('/admin/skills', formData);
          setFeedback({ type: 'success', message: 'Skill created successfully.' });
        }
      } else if (modalType === 'playlist') {
        if (editingItem) {
          await api.patch(`/admin/playlists/${editingItem._id}`, formData);
          setFeedback({ type: 'success', message: 'Playlist updated successfully.' });
        } else {
          await api.post('/admin/playlists', formData);
          setFeedback({ type: 'success', message: 'Playlist created successfully.' });
        }
      } else if (modalType === 'video') {
        if (editingItem) {
          await api.patch(`/admin/videos/${editingItem._id}`, formData);
          setFeedback({ type: 'success', message: 'Video lesson updated successfully.' });
        } else {
          await api.post('/admin/videos', formData);
          setFeedback({ type: 'success', message: 'Video lesson created successfully.' });
        }
      } else if (modalType === 'transcript') {
        await api.patch(`/admin/videos/${editingItem._id}/transcript`, {
          transcript: formData.transcript
        });
        setFeedback({ type: 'success', message: 'Video transcript updated successfully.' });
      }

      closeModal();
      fetchData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Action failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggle = async (endpoint, id, name) => {
    try {
      await api.patch(`/admin/${endpoint}/${id}/toggle`);
      setFeedback({ type: 'success', message: `Status toggled for '${name}'.` });
      fetchData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Status toggle failed.' });
    }
  };

  // Delete Entity with friendly confirmation & conflict error display
  const handleDelete = async (endpoint, id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${name}'? If user history references exist, delete will be safely blocked.`)) {
      return;
    }

    try {
      await api.delete(`/admin/${endpoint}/${id}`);
      setFeedback({ type: 'success', message: `'${name}' deleted successfully.` });
      fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || `Failed to delete '${name}'. Consider soft deactivation instead.`
      });
    }
  };

  // Keyboard escape listener to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalType) {
        closeModal();
      }
    };
    if (modalType) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalType]);

  return (
    <section className="admin-container">
      {/* Header */}
      <div className="page-header admin-header">
        <div>
          <span className="admin-badge">
            🛡️ Admin Control Panel
          </span>
          <h1 className="page-title admin-title">Catalog Curation & Management</h1>
          <p className="page-description admin-description">
            Logged in as administrator: <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>

        <div>
          {activeTab !== 'overview' && activeTab !== 'users' && (
            <button
              type="button"
              onClick={() => openCreateModal(activeTab.slice(0, -1))}
              className="btn btn-primary"
            >
              + Add New {activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div
          role="alert"
          className={`admin-feedback ${feedback.type === 'error' ? 'error' : 'success'}`}
        >
          <span>{feedback.message}</span>
          <div className="admin-feedback-actions">
            {feedback.type === 'error' && (
              <button
                type="button"
                onClick={fetchData}
                className="btn btn-secondary admin-feedback-retry"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => setFeedback({ type: '', message: '' })}
              className="admin-feedback-close"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="admin-tabs-nav">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'categories', label: '📁 Categories' },
          { id: 'skills', label: '💡 Skills' },
          { id: 'playlists', label: '📚 Playlists' },
          { id: 'videos', label: '🎬 Videos & Transcripts' },
          { id: 'users', label: '👥 User Accounts' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Rendering based on Tab */}
      {loading ? (
        <div className="card admin-loading-card">
          <p className="admin-loading-text">Loading catalog inventory...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <div className="admin-overview-grid">
                {[
                  { label: 'Total Categories', count: stats?.categories ?? 0, icon: '📁' },
                  { label: 'Curated Skills', count: stats?.skills ?? 0, icon: '💡' },
                  { label: 'Curated Playlists', count: stats?.playlists ?? 0, icon: '📚' },
                  { label: 'Total Video Lessons', count: stats?.videos ?? 0, icon: '🎬' },
                  { label: 'Registered Users', count: stats?.users ?? 0, icon: '👥' },
                  { label: 'Transcripts Available', count: stats?.videosWithTranscript ?? 0, icon: '📝' }
                ].map((item, idx) => (
                  <div key={idx} className="card admin-overview-card">
                    <div className="admin-overview-icon">{item.icon}</div>
                    <div>
                      <div className="admin-overview-count">{item.count}</div>
                      <div className="admin-overview-label">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 className="admin-rules-title">Catalog Governance & Deactivation Rules</h3>
                <ul className="admin-rules-list">
                  <li><strong>Computing Scope Only</strong>: Curate lessons strictly relating to CSE, software engineering, databases, IT, and data science.</li>
                  <li><strong>Soft Deactivation</strong>: Toggling an item to Inactive immediately hides it from catalog discovery while preserving all learner bookmarks, video playback offsets, AI notes, and quiz records.</li>
                  <li><strong>Hard Delete Safety</strong>: Hard deletion of videos with user history references is strictly blocked by the server to prevent data corruption.</li>
                  <li><strong>Transcripts</strong>: Edit or input video transcripts directly. SkillVault uses available transcripts first for AI notes, with clear UI attribution.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="card admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr className="admin-table-header-row">
                    <th className="admin-th">Icon & Name</th>
                    <th className="admin-th">Slug</th>
                    <th className="admin-th">Skills Count</th>
                    <th className="admin-th">Order</th>
                    <th className="admin-th">Status</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="admin-td-empty">
                        No categories found. Create the first computing category above.
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat._id} className="admin-table-row">
                        <td className="admin-td font-semibold">
                          {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                        </td>
                        <td className="admin-td font-mono">
                          {cat.slug}
                        </td>
                        <td className="admin-td">{cat.skillsCount || 0} skills</td>
                        <td className="admin-td">{cat.order}</td>
                        <td className="admin-td">
                          <span
                            className={`admin-status-badge ${cat.isActive ? 'active' : 'inactive'}`}
                          >
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="admin-td text-right">
                          <div className="admin-actions-group">
                            <button
                              type="button"
                              onClick={() => handleToggle('categories', cat._id, cat.name)}
                              className="btn btn-secondary admin-action-btn"
                            >
                              {cat.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal('category', cat)}
                              className="btn btn-secondary admin-action-btn"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete('categories', cat._id, cat.name)}
                              className="btn btn-secondary admin-action-btn delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: SKILLS */}
          {activeTab === 'skills' && (
            <div className="card admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr className="admin-table-header-row">
                    <th className="admin-th">Skill Name</th>
                    <th className="admin-th">Parent Category</th>
                    <th className="admin-th">Playlists / Videos</th>
                    <th className="admin-th">Status</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="admin-td-empty">
                        No skills found. Create your first skill above.
                      </td>
                    </tr>
                  ) : (
                    skills.map((sk) => (
                      <tr key={sk._id} className="admin-table-row">
                        <td className="admin-td font-semibold">
                          {sk.icon ? `${sk.icon} ` : ''}{sk.name}
                        </td>
                        <td className="admin-td text-muted">
                          {sk.category?.name || 'Unassigned'}
                        </td>
                        <td className="admin-td">
                          {sk.playlistsCount || 0} playlists • {sk.videosCount || 0} videos
                        </td>
                        <td className="admin-td">
                          <span
                            className={`admin-status-badge ${sk.isActive ? 'active' : 'inactive'}`}
                          >
                            {sk.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="admin-td text-right">
                          <div className="admin-actions-group">
                            <button
                              type="button"
                              onClick={() => handleToggle('skills', sk._id, sk.name)}
                              className="btn btn-secondary admin-action-btn"
                            >
                              {sk.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal('skill', sk)}
                              className="btn btn-secondary admin-action-btn"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete('skills', sk._id, sk.name)}
                              className="btn btn-secondary admin-action-btn delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: PLAYLISTS */}
          {activeTab === 'playlists' && (
            <div className="card admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr className="admin-table-header-row">
                    <th className="admin-th">Title</th>
                    <th className="admin-th">Skill Track</th>
                    <th className="admin-th">YouTube ID</th>
                    <th className="admin-th">Videos</th>
                    <th className="admin-th">Status</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {playlists.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="admin-td-empty">
                        No playlists found. Create your first curriculum playlist above.
                      </td>
                    </tr>
                  ) : (
                    playlists.map((pl) => (
                      <tr key={pl._id} className="admin-table-row">
                        <td className="admin-td font-semibold">{pl.title}</td>
                        <td className="admin-td text-muted">
                          {pl.skill?.name || 'Unassigned'}
                        </td>
                        <td className="admin-td font-mono">
                          {pl.externalYoutubePlaylistId || 'Internal'}
                        </td>
                        <td className="admin-td">{pl.videosCount || 0} lessons</td>
                        <td className="admin-td">
                          <span
                            className={`admin-status-badge ${pl.isActive ? 'active' : 'inactive'}`}
                          >
                            {pl.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="admin-td text-right">
                          <div className="admin-actions-group">
                            <button
                              type="button"
                              onClick={() => handleToggle('playlists', pl._id, pl.title)}
                              className="btn btn-secondary admin-action-btn"
                            >
                              {pl.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal('playlist', pl)}
                              className="btn btn-secondary admin-action-btn"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete('playlists', pl._id, pl.title)}
                              className="btn btn-secondary admin-action-btn delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: VIDEOS & TRANSCRIPTS */}
          {activeTab === 'videos' && (
            <div className="card admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr className="admin-table-header-row">
                    <th className="admin-th">Video Title</th>
                    <th className="admin-th">Skill & Playlist</th>
                    <th className="admin-th">YouTube ID / Duration</th>
                    <th className="admin-th">Transcript</th>
                    <th className="admin-th">Status</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="admin-td-empty">
                        No videos found. Add your first video lesson above.
                      </td>
                    </tr>
                  ) : (
                    videos.map((vid) => (
                      <tr key={vid._id} className="admin-table-row">
                        <td className="admin-video-title-cell">
                          <div>{vid.title}</div>
                          <div className="admin-video-slug">
                            /{vid.slug}
                          </div>
                        </td>
                        <td className="admin-td">
                          <div>{vid.skill?.name || 'Unassigned'}</div>
                          {vid.playlist?.title && (
                            <div className="admin-sub-text">↳ {vid.playlist.title}</div>
                          )}
                        </td>
                        <td className="admin-td">
                          <span className="admin-td font-mono">{vid.youtubeVideoId}</span>
                          <div className="admin-sub-text">
                            {Math.floor((vid.durationSeconds || 0) / 60)}m {(vid.durationSeconds || 0) % 60}s
                          </div>
                        </td>
                        <td className="admin-td">
                          <span
                            className={`admin-transcript-badge ${vid.hasTranscript ? 'has-transcript' : 'no-transcript'}`}
                          >
                            {vid.hasTranscript ? '✓ Transcript' : 'No Transcript'}
                          </span>
                        </td>
                        <td className="admin-td">
                          <span
                            className={`admin-status-badge ${vid.isActive ? 'active' : 'inactive'}`}
                          >
                            {vid.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="admin-td text-right">
                          <div className="admin-actions-group gap-sm">
                            <button
                              type="button"
                              onClick={() => openEditModal('transcript', vid)}
                              className="btn btn-secondary admin-action-btn compact"
                              title="Edit Transcript"
                            >
                              📝 Transcript
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggle('videos', vid._id, vid.title)}
                              className="btn btn-secondary admin-action-btn compact"
                            >
                              {vid.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal('video', vid)}
                              className="btn btn-secondary admin-action-btn compact"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete('videos', vid._id, vid.title)}
                              className="btn btn-secondary admin-action-btn compact delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: USERS */}
          {activeTab === 'users' && (
            <div className="card admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr className="admin-table-header-row">
                    <th className="admin-th">Name</th>
                    <th className="admin-th">Email</th>
                    <th className="admin-th">Role</th>
                    <th className="admin-th">Quizzes Attempted</th>
                    <th className="admin-th">Joined Date</th>
                    <th className="admin-th">Status</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="admin-td-empty">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u._id} className="admin-table-row">
                        <td className="admin-td font-semibold">{u.name}</td>
                        <td className="admin-td text-muted">{u.email}</td>
                        <td className="admin-td">
                          <span
                            className={`admin-role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="admin-td">{u.quizzesAttemptedCount || 0}</td>
                        <td className="admin-td font-mono">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="admin-td">
                          <span
                            className={`admin-status-badge ${u.isActive ? 'active' : 'inactive'}`}
                          >
                            {u.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="admin-td text-right">
                          {u._id !== user?.id && u._id !== user?._id && (
                            <button
                              type="button"
                              onClick={() => handleToggle('users', u._id, u.name)}
                              className="btn btn-secondary admin-action-btn"
                            >
                              {u.isActive ? 'Suspend' : 'Reactivate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* CRUD / TRANSCRIPT MODAL */}
      {modalType && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-modal-title"
          className="admin-modal-overlay"
        >
          <div
            className={`card admin-modal-dialog ${modalType === 'transcript' ? 'transcript' : ''}`}
          >
            <div className="admin-modal-header">
              <h2 id="admin-modal-title" className="admin-modal-title">
                {modalType === 'transcript'
                  ? `Edit Transcript: ${editingItem?.title}`
                  : `${editingItem ? 'Edit' : 'Create'} ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close dialog"
                className="admin-modal-close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="admin-form">
              {/* Category Fields */}
              {modalType === 'category' && (
                <>
                  <div>
                    <label className="admin-form-label">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Systems & Storage Architecture"
                      className="admin-form-input"
                    />
                  </div>
                  <div>
                    <label className="admin-form-label">
                      Description
                    </label>
                    <textarea
                      rows="3"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief summary of this technical computing category"
                      className="admin-form-input"
                    />
                  </div>
                  <div className="admin-form-row-2col">
                    <div>
                      <label className="admin-form-label">
                        Icon (Emoji or identifier)
                      </label>
                      <input
                        type="text"
                        value={formData.icon || ''}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        placeholder="e.g. 💾"
                        className="admin-form-input"
                      />
                    </div>
                    <div>
                      <label className="admin-form-label">
                        Display Order
                      </label>
                      <input
                        type="number"
                        value={formData.order || 0}
                        onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                        className="admin-form-input"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Skill Fields */}
              {modalType === 'skill' && (
                <>
                  <div>
                    <label className="admin-form-label">
                      Skill Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Database Storage Engines"
                      className="admin-form-input"
                    />
                  </div>
                  <div>
                    <label className="admin-form-label">
                      Parent Category *
                    </label>
                    <select
                      required
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="admin-form-input"
                    >
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="admin-form-label">
                      Description
                    </label>
                    <textarea
                      rows="3"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Technical overview of this skill"
                      className="admin-form-input"
                    />
                  </div>
                  <div className="admin-form-row-2col">
                    <div>
                      <label className="admin-form-label">
                        Icon (Emoji)
                      </label>
                      <input
                        type="text"
                        value={formData.icon || ''}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        placeholder="e.g. ⚙️"
                        className="admin-form-input"
                      />
                    </div>
                    <div>
                      <label className="admin-form-label">
                        Display Order
                      </label>
                      <input
                        type="number"
                        value={formData.order || 0}
                        onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                        className="admin-form-input"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Playlist Fields */}
              {modalType === 'playlist' && (
                <>
                  <div>
                    <label className="admin-form-label">
                      Playlist Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Full Database Internals Track"
                      className="admin-form-input"
                    />
                  </div>
                  <div>
                    <label className="admin-form-label">
                      Associated Skill *
                    </label>
                    <select
                      required
                      value={formData.skill || ''}
                      onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                      className="admin-form-input"
                    >
                      {skills.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="admin-form-label">
                      External YouTube Playlist ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.externalYoutubePlaylistId || ''}
                      onChange={(e) => setFormData({ ...formData, externalYoutubePlaylistId: e.target.value })}
                      placeholder="e.g. PL0zVEGEvSaeEd9hlmCXrk5yUyqUag-X84"
                      className="admin-form-input"
                    />
                  </div>
                  <div>
                    <label className="admin-form-label">
                      Description
                    </label>
                    <textarea
                      rows="3"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Curriculum track description"
                      className="admin-form-input"
                    />
                  </div>
                  <div>
                    <label className="admin-form-label">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.order || 0}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="admin-form-input"
                    />
                  </div>
                </>
              )}

              {/* Video Fields */}
              {modalType === 'video' && (
                <>
                  <div>
                    <label className="admin-form-label">
                      Lesson Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Page Formats and Tuple Layout"
                      className="admin-form-input"
                    />
                  </div>
                  <div className="admin-form-row-2col">
                    <div>
                      <label className="admin-form-label">
                        YouTube Video ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.youtubeVideoId || ''}
                        onChange={(e) => setFormData({ ...formData, youtubeVideoId: e.target.value })}
                        placeholder="e.g. dQw4w9WgXcQ"
                        className="admin-form-input"
                      />
                    </div>
                    <div>
                      <label className="admin-form-label">
                        Duration (in Seconds) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.durationSeconds ?? 0}
                        onChange={(e) => setFormData({ ...formData, durationSeconds: Number(e.target.value) })}
                        placeholder="e.g. 1200"
                        className="admin-form-input"
                      />
                    </div>
                  </div>
                  <div className="admin-form-row-2col">
                    <div>
                      <label className="admin-form-label">
                        Associated Skill *
                      </label>
                      <select
                        required
                        value={formData.skill || ''}
                        onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                        className="admin-form-input"
                      >
                        {skills.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="admin-form-label">
                        Playlist (Optional)
                      </label>
                      <select
                        value={formData.playlist || ''}
                        onChange={(e) => setFormData({ ...formData, playlist: e.target.value })}
                        className="admin-form-input"
                      >
                        <option value="">None (Standalone Lesson)</option>
                        {playlists.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="admin-form-label">
                      Video Description & Topics Covered
                    </label>
                    <textarea
                      rows="3"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Topics covered in this video lesson (used as primary grounding for AI notes and quiz)"
                      className="admin-form-input"
                    />
                  </div>
                  <div>
                    <label className="admin-form-label">
                      Transcript Input (Optional admin-provided text)
                    </label>
                    <textarea
                      rows="4"
                      value={formData.transcript || ''}
                      onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                      placeholder="Admin-supplied lesson transcript text"
                      className="admin-form-input"
                    />
                  </div>
                </>
              )}

              {/* Dedicated Transcript Editor Modal */}
              {modalType === 'transcript' && (
                <div>
                  <p className="admin-transcript-help">
                    Enter or paste the lesson transcript below. Providing transcript text automatically sets <code>hasTranscript: true</code> and activates transcript-grounded notes generation.
                  </p>
                  <textarea
                    rows="12"
                    value={formData.transcript || ''}
                    onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                    placeholder="Paste comprehensive transcript text here..."
                    className="admin-transcript-textarea"
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className="admin-modal-actions">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminPage;
