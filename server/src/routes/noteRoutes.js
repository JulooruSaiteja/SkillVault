import express from 'express';
import { getVideoNotes, generateVideoNotes } from '../controllers/noteController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/notes/:identifier
 * @desc    Get cached AI notes for a video by ID or slug and quota status
 * @access  Public (optionalAuth)
 */
router.get('/:identifier', optionalAuth, getVideoNotes);

/**
 * @route   POST /api/notes/:identifier
 * @desc    Generate AI notes for a video using Gemini 3.8 Flash
 * @access  Private (requireAuth)
 */
router.post('/:identifier', requireAuth, generateVideoNotes);

export default router;
