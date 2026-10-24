import express from 'express';
import { getVideos, getVideoById } from '../controllers/videoController.js';
import { saveProgress, getProgress } from '../controllers/progressController.js';
import { addBookmark, removeBookmark, checkBookmark } from '../controllers/bookmarkController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/videos
 * @desc    List active videos (supports ?skill=slug_or_id and ?playlist=slug_or_id)
 * @access  Public
 */
router.get('/', getVideos);

/**
 * @route   GET /api/videos/:identifier
 * @desc    Get video details by ID or slug with playlist context and optional user progress
 * @access  Public (optionalAuth)
 */
router.get('/:identifier', optionalAuth, getVideoById);

/**
 * @route   GET /api/videos/:identifier/progress
 * @desc    Get video progress for authenticated user
 * @access  Private
 */
router.get('/:identifier/progress', requireAuth, getProgress);

/**
 * @route   POST /api/videos/:identifier/progress
 * @desc    Save video progress for authenticated user
 * @access  Private
 */
router.post('/:identifier/progress', requireAuth, saveProgress);

/**
 * @route   GET /api/videos/:identifier/bookmark
 * @desc    Check bookmark status for authenticated user
 * @access  Private
 */
router.get('/:identifier/bookmark', requireAuth, checkBookmark);

/**
 * @route   POST /api/videos/:identifier/bookmark
 * @desc    Bookmark video for authenticated user
 * @access  Private
 */
router.post('/:identifier/bookmark', requireAuth, addBookmark);

/**
 * @route   DELETE /api/videos/:identifier/bookmark
 * @desc    Remove bookmark for authenticated user
 * @access  Private
 */
router.delete('/:identifier/bookmark', requireAuth, removeBookmark);

export default router;
