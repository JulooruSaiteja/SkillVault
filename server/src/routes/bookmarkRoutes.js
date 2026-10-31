import express from 'express';
import {
  addBookmark,
  removeBookmark,
  getBookmarks,
  checkBookmark
} from '../controllers/bookmarkController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All bookmark routes require authentication
router.use(requireAuth);

/**
 * @route   GET /api/bookmarks
 * @desc    List all personal bookmarks for the authenticated learner
 * @access  Private
 */
router.get('/', getBookmarks);

/**
 * @route   POST /api/bookmarks
 * @desc    Add a video to bookmarks
 * @access  Private
 */
router.post('/', addBookmark);

/**
 * @route   GET /api/bookmarks/check/:identifier
 * @desc    Check if a specific video is bookmarked by the learner
 * @access  Private
 */
router.get('/check/:identifier', checkBookmark);

/**
 * @route   POST /api/bookmarks/:identifier
 * @desc    Add a specific video to bookmarks by ID or slug
 * @access  Private
 */
router.post('/:identifier', addBookmark);

/**
 * @route   DELETE /api/bookmarks/:identifier
 * @desc    Remove a video from bookmarks by ID or slug
 * @access  Private
 */
router.delete('/:identifier', removeBookmark);

export default router;
