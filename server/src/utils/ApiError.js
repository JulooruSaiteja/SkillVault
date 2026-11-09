/**
 * Custom API error class for SkillVault.
 * Used throughout the backend to throw HTTP-aware errors
 * that the centralized error handler can format consistently.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable error message
   * @param {Array} [errors] - Optional array of field-level validation errors
   * @param {string} [code] - Machine-readable error code (e.g. 'VALIDATION_ERROR')
   * @param {object} [options] - Optional error metadata (isRetryable, retryAfterMs, resetsAt)
   */
  constructor(statusCode, message, errors = [], code = null, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;
    this.isOperational = true;
    this.isRetryable = options.isRetryable ?? (statusCode >= 500 && statusCode !== 501);
    this.retryAfterMs = options.retryAfterMs ?? null;
    this.resetsAt = options.resetsAt ?? null;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errors = [], code = 'VALIDATION_ERROR') {
    return new ApiError(400, message, errors, code, { isRetryable: false });
  }

  static unauthorized(message = 'Authentication required', code = 'AUTHENTICATION_REQUIRED') {
    return new ApiError(401, message, [], code, { isRetryable: false });
  }

  static forbidden(message = 'Access denied', code = 'FORBIDDEN_ACCESS') {
    return new ApiError(403, message, [], code, { isRetryable: false });
  }

  static notFound(message = 'Resource not found', code = 'RESOURCE_NOT_FOUND') {
    return new ApiError(404, message, [], code, { isRetryable: false });
  }

  static conflict(message = 'Resource already exists', errors = [], code = 'DUPLICATE_RESOURCE') {
    return new ApiError(409, message, errors, code, { isRetryable: false });
  }

  static tooManyRequests(message = 'Too many requests, please try again later', code = 'RATE_LIMIT_EXCEEDED', options = {}) {
    return new ApiError(429, message, [], code, { isRetryable: true, ...options });
  }

  static serviceUnavailable(message = 'Service temporarily unavailable. Please try again shortly.', code = 'SERVICE_UNAVAILABLE', options = {}) {
    return new ApiError(503, message, [], code, { isRetryable: true, ...options });
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new ApiError(500, message, [], code, { isRetryable: true });
  }
}

export default ApiError;
