import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layouts/Layout';
import HomePage from './pages/HomePage';
import CategoriesPage from './pages/CategoriesPage';
import SkillDetailPage from './pages/SkillDetailPage';
import PlaylistPage from './pages/PlaylistPage';
import VideoPage from './pages/VideoPage';
import SearchPage from './pages/SearchPage';
import BookmarksPage from './pages/BookmarksPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import NotFoundPage from './pages/NotFoundPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="skills/:skillSlug" element={<SkillDetailPage />} />
          <Route path="playlists/:playlistId" element={<PlaylistPage />} />
          <Route path="videos/:videoId" element={<VideoPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route
            path="bookmarks"
            element={
              <ProtectedRoute>
                <BookmarksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
