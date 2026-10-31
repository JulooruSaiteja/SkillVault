import express from 'express';
import {
  getVideoQuiz,
  generateVideoQuiz,
  submitVideoQuiz
} from '../controllers/quizController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/quizzes/:identifier
 * @desc    Get cached AI quiz for a video by ID or slug and quota status
 * @access  Public (optionalAuth)
 */
router.get('/:identifier', optionalAuth, getVideoQuiz);

/**
 * @route   POST /api/quizzes/:identifier
 * @desc    Generate AI quiz for a video using Gemini 3.1 Flash Lite
 * @access  Private (requireAuth)
 */
router.post('/:identifier', requireAuth, generateVideoQuiz);

/**
 * @route   POST /api/quizzes/:identifier/submit
 * @desc    Submit answers for evaluation and score calculation (X/5 marks)
 * @access  Private (requireAuth)
 */
router.post('/:identifier/submit', requireAuth, submitVideoQuiz);

export default router;
