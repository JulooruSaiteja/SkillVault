import config from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Centralized error-handling middleware for SkillVault.
 *
 * Catches all errors propagated via next(err) and returns
 * a uniform JSON error response. Never exposes stack traces
 * or internal details to clients in production.
 *
 * Automatically normalizes:
 * - Mongoose ValidationError -> HTTP 400 Bad Request
 * - Mongoose CastError -> HTTP 400 Bad Request
 * - MongoDB duplicate key (11000) -> HTTP 409 Conflict
 * - Body-parser parse error -> HTTP 400 Bad Request
 * - Payload too large -> HTTP 413 Payload Too Large
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // 1. Handle Mongoose Validation Error (Schema constraint failure)
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // 2. Handle Mongoose CastError (e.g., malformed ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier format: ${err.path || 'id'}`;
    errors = [
      {
        field: err.path || 'id',
        message: `Invalid format for ${err.path || 'id'}: ${err.value}`
      }
    ];
  }

  // 3. Handle MongoDB Duplicate Key Error (Unique index violation)
  else if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'resource';
    message = `Duplicate value entered for ${duplicatedField}. A record with this ${duplicatedField} already exists.`;
    errors = [
      {
        field: duplicatedField,
        message: `${duplicatedField} must be unique`
      }
    ];
  }

  // 4. Handle malformed JSON body from express.json()
  else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body';
    errors = [];
  }

  // 5. Handle payload too large
  else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large';
    errors = [];
  }

  // Safe server logging: sanitize message and stack so secrets/passwords are never logged
  if (statusCode >= 500) {
    const sanitizedUrl = logger.sanitizeString(req.originalUrl || req.url || '');
    const sanitizedMsg = logger.sanitizeString(err.message || '');
    logger.error(`[ERROR] ${req.method} ${sanitizedUrl}: ${sanitizedMsg}`);
    if (config.isDev && err.stack) {
      logger.error(logger.sanitizeString(err.stack));
    }
  }

  // Never expose internal details in production
  if (statusCode >= 500 && config.isProd) {
    message = 'Internal server error';
    errors = [];
  }

  const responseBody = {
    success: false,
    message,
    ...(errors.length > 0 && { errors })
  };

  // Include stack trace in development only (sanitized)
  if (config.isDev && err.stack) {
    responseBody.stack = logger.sanitizeString(err.stack);
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
