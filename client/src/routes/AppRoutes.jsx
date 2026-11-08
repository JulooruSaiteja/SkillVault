import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Layout from '../components/layout/Layout';
import Home from '../pages/Home';
import Categories from '../pages/Categories';
import SkillDetail from '../pages/SkillDetail';
import Playlist from '../pages/Playlist';
import Video from '../pages/Video';
import Search from '../pages/Search';
import Bookmarks from '../pages/Bookmarks';
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import Admin from '../pages/Admin';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import NotFound from '../pages/NotFound';

/**
 * SkillVault Route Definitions
 * Centralizes all declarative routing, layouts, and protected guards.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="categories" element={<Categories />} />
        <Route path="skills/:skillSlug" element={<SkillDetail />} />
        <Route path="playlists/:playlistId" element={<Playlist />} />
        <Route path="videos/:videoId" element={<Video />} />
        <Route path="search" element={<Search />} />
        <Route
          path="bookmarks"
          element={
            <ProtectedRoute>
              <Bookmarks />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
