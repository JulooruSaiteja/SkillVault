import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// Public routes with brute-force rate limiting
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);

// Protected routes
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, updateProfile);
router.put('/profile', requireAuth, updateProfile);
router.post('/change-password', requireAuth, authLimiter, changePassword);

export default router;
