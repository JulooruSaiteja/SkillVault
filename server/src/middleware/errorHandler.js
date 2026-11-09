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
  let code = typeof err.code === 'string' ? err.code : null;
  let isRetryable = err.isRetryable;
  let retryAfterMs = err.retryAfterMs || null;
  let resetsAt = err.resetsAt || null;

  // 1. Handle Mongoose Validation Error (Schema constraint failure)
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = code || 'VALIDATION_ERROR';
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    isRetryable = false;
  }

  // 2. Handle Mongoose CastError (e.g., malformed ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    code = code || 'INVALID_IDENTIFIER';
    message = `Invalid identifier format: ${err.path || 'id'}`;
    errors = [
      {
        field: err.path || 'id',
        message: `Invalid format for ${err.path || 'id'}: ${err.value}`
      }
    ];
    isRetryable = false;
  }

  // 3. Handle MongoDB Duplicate Key Error (Unique index violation)
  else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    const duplicatedField = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'resource';
    message = `Duplicate value entered for ${duplicatedField}. A record with this ${duplicatedField} already exists.`;
    errors = [
      {
        field: duplicatedField,
        message: `${duplicatedField} must be unique`
      }
    ];
    isRetryable = false;
  }

  // 4. Handle MongoDB Network & Selection Failures (Database outage)
  else if (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoServerSelectionError'
  ) {
    statusCode = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'Database service is temporarily unavailable. Please try again shortly.';
    isRetryable = true;
    retryAfterMs = retryAfterMs || 5000;
  }

  // 5. Handle malformed JSON body from express.json()
  else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Malformed JSON in request body';
    errors = [];
    isRetryable = false;
  }

  // 6. Handle payload too large
  else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body too large';
    errors = [];
    isRetryable = false;
  }

  // Resolve default code if still unassigned
  if (!code) {
    switch (statusCode) {
      case 400:
        code = 'BAD_REQUEST';
        break;
      case 401:
        code = 'AUTHENTICATION_REQUIRED';
        break;
      case 403:
        code = 'FORBIDDEN_ACCESS';
        break;
      case 404:
        code = 'RESOURCE_NOT_FOUND';
        break;
      case 409:
        code = 'CONFLICT';
        break;
      case 429:
        code = 'RATE_LIMIT_EXCEEDED';
        break;
      case 503:
        code = 'SERVICE_UNAVAILABLE';
        break;
      default:
        code = statusCode >= 500 ? 'INTERNAL_ERROR' : 'ERROR';
        break;
    }
  }

  if (isRetryable === undefined) {
    isRetryable = statusCode >= 500 && statusCode !== 501;
  }

  // Set HTTP Retry-After header if retry delay is specified
  if (retryAfterMs && (statusCode === 429 || statusCode === 503)) {
    res.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000));
  }

  // Safe server logging: sanitize message and stack so secrets/passwords are never logged
  if (statusCode >= 500) {
    const sanitizedUrl = logger.sanitizeString(req.originalUrl || req.url || '');
    const sanitizedMsg = logger.sanitizeString(err.message || '');
    logger.error(`[ERROR] ${req.method} ${sanitizedUrl}: [${code}] ${sanitizedMsg}`);
    if (config.isDev && err.stack) {
      logger.error(logger.sanitizeString(err.stack));
    }
  }

  // Never expose internal details in production for unexpected 500s
  if (statusCode >= 500 && statusCode !== 503 && config.isProd) {
    message = 'Internal server error';
    errors = [];
  }

  const responseBody = {
    success: false,
    code,
    message,
    statusCode,
    ...(errors.length > 0 && { errors }),
    ...(isRetryable !== undefined && { isRetryable }),
    ...(retryAfterMs != null && { retryAfterMs }),
    ...(resetsAt != null && { resetsAt })
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
