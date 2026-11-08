import express from 'express';
import { getVideos, getVideoById } from '../controllers/videoController.js';
import { saveProgress, getProgress } from '../controllers/progressController.js';
import { addBookmark, removeBookmark, checkBookmark } from '../controllers/bookmarkController.js';
import { getVideoNotes, generateVideoNotes } from '../controllers/noteController.js';
import {
  getVideoQuiz,
  generateVideoQuiz,
  submitVideoQuiz
} from '../controllers/quizController.js';
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

/**
 * @route   GET /api/videos/:identifier/notes
 * @desc    Get cached AI notes and quota status
 * @access  Public (optionalAuth)
 */
router.get('/:identifier/notes', optionalAuth, getVideoNotes);

/**
 * @route   POST /api/videos/:identifier/notes
 * @desc    Generate AI notes using Gemini 3.8 Flash
 * @access  Private (requireAuth)
 */
router.post('/:identifier/notes', requireAuth, generateVideoNotes);

/**
 * @route   GET /api/videos/:identifier/quiz
 * @desc    Get cached AI quiz and quota status
 * @access  Public (optionalAuth)
 */
router.get('/:identifier/quiz', optionalAuth, getVideoQuiz);

/**
 * @route   POST /api/videos/:identifier/quiz
 * @desc    Generate AI quiz using Gemini 3.1 Flash Lite
 * @access  Private (requireAuth)
 */
router.post('/:identifier/quiz', requireAuth, generateVideoQuiz);

/**
 * @route   POST /api/videos/:identifier/quiz/submit
 * @desc    Submit answers for evaluation and score calculation (X/5 marks)
 * @access  Private (requireAuth)
 */
router.post('/:identifier/quiz/submit', requireAuth, submitVideoQuiz);

export default router;
