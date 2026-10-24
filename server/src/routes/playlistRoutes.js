import express from 'express';
import { getPlaylists, getPlaylistById } from '../controllers/playlistController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/playlists
 * @desc    List active playlists (supports ?skill=slug_or_id and optional user progress)
 * @access  Public (optionalAuth)
 */
router.get('/', optionalAuth, getPlaylists);

/**
 * @route   GET /api/playlists/:identifier
 * @desc    Get playlist details by ID or slug with ordered videos and progress percentage
 * @access  Public (optionalAuth)
 */
router.get('/:identifier', optionalAuth, getPlaylistById);

export default router;
