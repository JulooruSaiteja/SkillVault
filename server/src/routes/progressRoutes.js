import express from 'express';
import {
  saveProgress,
  getProgress,
  getRecentProgress
} from '../controllers/progressController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All progress endpoints require authenticated user
router.use(requireAuth);

/**
 * @route   GET /api/progress/recent
 * @desc    Get recent progress / continue-learning queue for learner
 * @access  Private
 */
router.get('/recent', getRecentProgress);

/**
 * @route   GET /api/progress/continue-learning
 * @desc    Alias for /api/progress/recent
 * @access  Private
 */
router.get('/continue-learning', getRecentProgress);

/**
 * @route   POST /api/progress
 * @desc    Save video playback progress
 * @access  Private
 */
router.post('/', saveProgress);

/**
 * @route   GET /api/progress/:identifier
 * @desc    Get playback progress for a specific video by ID or slug
 * @access  Private
 */
router.get('/:identifier', getProgress);

/**
 * @route   POST /api/progress/:identifier
 * @desc    Save playback progress for a specific video by ID or slug
 * @access  Private
 */
router.post('/:identifier', saveProgress);

export default router;
