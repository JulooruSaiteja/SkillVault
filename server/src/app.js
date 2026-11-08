import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import config from './config/env.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import playlistRoutes from './routes/playlistRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import bookmarkRoutes from './routes/bookmarkRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// ------------------------------------
// Security Headers (Helmet)
// ------------------------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// ------------------------------------
// Request Logging (Morgan) with Safe Sanitization
// ------------------------------------
morgan.token('url', (req) => logger.sanitizeString(req.originalUrl || req.url));
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// ------------------------------------
// CORS Configuration
// ------------------------------------
app.use(cors({
  origin: config.clientOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ------------------------------------
// Rate Limiting
// ------------------------------------
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                  // 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  }
});
app.use(globalLimiter);

// ------------------------------------
// Body Parsing
// ------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ------------------------------------
// Cookie Parsing
// ------------------------------------
app.use(cookieParser(config.cookieSecret));

// ------------------------------------
// API Routes
// ------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// ------------------------------------
// Unknown Route Handler (must be after all routes)
// ------------------------------------
app.use(notFoundHandler);

// ------------------------------------
// Centralized Error Handler (must be last middleware)
// ------------------------------------
app.use(errorHandler);

export default app;
