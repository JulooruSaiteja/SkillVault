import config from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/**
 * Centralized error-handling middleware for SkillVault.
 *
 * Catches all errors propagated via next(err) and returns
 * a uniform JSON error response. Never exposes stack traces
 * or internal details to clients in production.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Default to 500 if no statusCode is set
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // Handle malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body';
    errors = [];
  }

  // Handle payload too large
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large';
    errors = [];
  }

  // Log server errors (not client errors)
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
    if (config.isDev) {
      console.error(err.stack);
    }
  }

  // Never expose internal details in production
  if (statusCode >= 500 && config.isProd) {
    message = 'Internal server error';
  }

  const responseBody = {
    success: false,
    message,
    ...(errors.length > 0 && { errors })
  };

  // Include stack trace in development only
  if (config.isDev && err.stack) {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
}

/**
 * Catch-all middleware for unknown routes.
 * Placed after all valid route handlers.
 */
export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export default errorHandler;
