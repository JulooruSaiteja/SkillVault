import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

/**
 * Specialized rate limiter for sensitive authentication endpoints.
 * Protects login and registration against brute-force and credential stuffing.
 * Configured with higher threshold during testing to prevent suite interruption.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isTest ? 1000 : 25, // 25 attempts per 15 min in prod/dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
  }
});

export default { authLimiter };
