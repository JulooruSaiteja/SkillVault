import express from 'express';
import {
  getAdminStats,
  getAdminCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  getAdminSkills,
  createSkill,
  updateSkill,
  toggleSkillStatus,
  deleteSkill,
  getAdminPlaylists,
  createPlaylist,
  updatePlaylist,
  togglePlaylistStatus,
  deletePlaylist,
  getAdminVideos,
  createVideo,
  updateVideo,
  updateVideoTranscript,
  toggleVideoStatus,
  deleteVideo,
  getAdminUsers,
  toggleUserStatus
} from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Strict security: all admin routes require authentication AND admin privileges
router.use(requireAuth, requireAdmin);

// Overview Stats
router.get('/stats', getAdminStats);

// Categories
router.get('/categories', getAdminCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.patch('/categories/:id', updateCategory);
router.patch('/categories/:id/toggle', toggleCategoryStatus);
router.delete('/categories/:id', deleteCategory);

// Skills
router.get('/skills', getAdminSkills);
router.post('/skills', createSkill);
router.put('/skills/:id', updateSkill);
router.patch('/skills/:id', updateSkill);
router.patch('/skills/:id/toggle', toggleSkillStatus);
router.delete('/skills/:id', deleteSkill);

// Playlists
router.get('/playlists', getAdminPlaylists);
router.post('/playlists', createPlaylist);
router.put('/playlists/:id', updatePlaylist);
router.patch('/playlists/:id', updatePlaylist);
router.patch('/playlists/:id/toggle', togglePlaylistStatus);
router.delete('/playlists/:id', deletePlaylist);

// Videos & Transcript
router.get('/videos', getAdminVideos);
router.post('/videos', createVideo);
router.put('/videos/:id', updateVideo);
router.patch('/videos/:id', updateVideo);
router.patch('/videos/:id/transcript', updateVideoTranscript);
router.patch('/videos/:id/toggle', toggleVideoStatus);
router.delete('/videos/:id', deleteVideo);

// Users
router.get('/users', getAdminUsers);
router.patch('/users/:id/toggle', toggleUserStatus);

export default router;
