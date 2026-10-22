import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import config from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// ------------------------------------
// Security Headers (Helmet)
// ------------------------------------
app.use(helmet());

// ------------------------------------
// Request Logging (Morgan)
// ------------------------------------
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
// Route modules will be mounted here in later phases, e.g.:
//   app.use('/api/auth', authRoutes);
//   app.use('/api/categories', categoryRoutes);
//   app.use('/api/skills', skillRoutes);
//   app.use('/api/playlists', playlistRoutes);
//   app.use('/api/videos', videoRoutes);
//   app.use('/api/search', searchRoutes);
//   app.use('/api/ai', aiRoutes);

// ------------------------------------
// Unknown Route Handler (must be after all routes)
// ------------------------------------
app.use(notFoundHandler);

// ------------------------------------
// Centralized Error Handler (must be last middleware)
// ------------------------------------
app.use(errorHandler);

export default app;
