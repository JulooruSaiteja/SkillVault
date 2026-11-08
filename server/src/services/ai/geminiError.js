import ApiError from '../../utils/ApiError.js';
import { getUtcNextReset } from '../../utils/utcDate.js';

export const AI_ERROR_CODES = Object.freeze({
  GLOBAL_QUOTA_EXHAUSTED: 'GLOBAL_QUOTA_EXHAUSTED',
  USER_QUOTA_EXHAUSTED: 'USER_QUOTA_EXHAUSTED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AUTH_ERROR: 'AI_AUTH_ERROR',
  PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  INVALID_INPUT: 'AI_INVALID_INPUT',
  INVALID_OUTPUT: 'AI_INVALID_OUTPUT'
});

/**
 * Standardized AI Service Error representation.
 * Inherits from ApiError to integrate seamlessly with SkillVault's errorHandler middleware.
 */
export class AiError extends ApiError {
  /**
   * @param {object} params
   * @param {string} params.code - One of AI_ERROR_CODES
   * @param {string} params.message - Safe user-facing message
   * @param {number} [params.statusCode=500] - HTTP status code
   * @param {string} [params.feature] - 'notes' or 'quiz'
   * @param {boolean} [params.isTemporary=false] - Whether the error is transient (e.g. minute-level rate limit)
   * @param {boolean} [params.isRetryable=false] - Whether the operation can be retried
   * @param {Date|null} [params.resetsAt=null] - Next UTC reset timestamp (for daily quotas)
   * @param {number|null} [params.retryAfterMs=null] - Suggested wait time before retry
   * @param {Array} [params.errors=[]] - Optional sub-errors
   */
  constructor({
    code,
    message,
    statusCode = 500,
    feature = null,
    isTemporary = false,
    isRetryable = false,
    resetsAt = null,
    retryAfterMs = null,
    errors = []
  }) {
    super(statusCode, sanitizeErrorMessage(message), errors);
    this.name = 'AiError';
    this.code = code;
    this.feature = feature;
    this.isTemporary = isTemporary;
    this.isRetryable = isRetryable;
    this.resetsAt = resetsAt;
    this.retryAfterMs = retryAfterMs;
  }

  static globalQuotaExhausted(feature, resetsAt = getUtcNextReset()) {
    const label = feature === 'notes' ? 'Notes' : 'Quiz';
    return new AiError({
      code: AI_ERROR_CODES.GLOBAL_QUOTA_EXHAUSTED,
      message: `The daily global AI quota for ${label} generation has been reached. Please try again after 00:00 UTC.`,
      statusCode: 429,
      feature,
      isTemporary: false,
      isRetryable: false,
      resetsAt
    });
  }

  static userQuotaExhausted(feature, limit = 1, resetsAt = getUtcNextReset()) {
    const label = feature === 'notes' ? 'notes generation' : 'quiz generations';
    return new AiError({
      code: AI_ERROR_CODES.USER_QUOTA_EXHAUSTED,
      message: `You have reached your daily limit of ${limit} ${label}. Your allowance resets at 00:00 UTC.`,
      statusCode: 429,
      feature,
      isTemporary: false,
      isRetryable: false,
      resetsAt
    });
  }

  static rateLimitExceeded(feature, retryAfterMs = 5000) {
    return new AiError({
      code: AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'AI service rate limit exceeded. Please wait a moment and try again.',
      statusCode: 429,
      feature,
      isTemporary: true,
      isRetryable: true,
      retryAfterMs
    });
  }

  static authError(feature = null) {
    return new AiError({
      code: AI_ERROR_CODES.AUTH_ERROR,
      message: 'AI service authentication failed. Please verify server configuration.',
      statusCode: 500,
      feature,
      isTemporary: false,
      isRetryable: false
    });
  }

  static providerUnavailable(feature = null, customMessage = null) {
    return new AiError({
      code: AI_ERROR_CODES.PROVIDER_UNAVAILABLE,
      message: customMessage || 'The AI service is temporarily unavailable. Please try again shortly.',
      statusCode: 503,
      feature,
      isTemporary: true,
      isRetryable: true
    });
  }

  static invalidInput(message, feature = null) {
    return new AiError({
      code: AI_ERROR_CODES.INVALID_INPUT,
      message: message || 'Invalid input provided for AI generation.',
      statusCode: 400,
      feature,
      isTemporary: false,
      isRetryable: false
    });
  }

  static invalidOutput(message, feature = null) {
    return new AiError({
      code: AI_ERROR_CODES.INVALID_OUTPUT,
      message: message || 'AI service returned malformed or unparseable output.',
      statusCode: 502,
      feature,
      isTemporary: true,
      isRetryable: false
    });
  }
}

/**
 * Sanitize an error message to prevent accidental exposure of API keys, tokens, or private URLs.
 *
 * @param {string} str
 * @returns {string} Sanitized string
 */
export function sanitizeErrorMessage(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/(?:key|apiKey)=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]')
    .replace(/AIza[0-9A-Za-z\-_]{10,50}/g, '[REDACTED_API_KEY]')
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
}

/**
 * Normalizes raw provider/network/runtime errors into a uniform AiError instance.
 *
 * @param {unknown} err - Error caught during AI processing
 * @param {string} [feature] - 'notes' or 'quiz'
 * @returns {AiError} Standardized AiError instance
 */
export function normalizeGeminiError(err, feature = null) {
  if (err instanceof AiError) {
    return err;
  }

  const status = err?.status || err?.statusCode || 500;
  const rawMessage = err?.message || String(err);

  if (process.env.NODE_ENV !== 'production') {
    console.error('[Gemini Provider Raw Error]:', sanitizeErrorMessage(rawMessage));
  }

  // Attempt to parse JSON error message if provided by Google SDK
  let parsedError = null;
  if (typeof rawMessage === 'string' && rawMessage.trim().startsWith('{')) {
    try {
      parsedError = JSON.parse(rawMessage);
    } catch {
      // Non-JSON or malformed string
    }
  }

  const googleCode = parsedError?.error?.code || status;
  const googleStatus = parsedError?.error?.status || '';
  const reason = parsedError?.error?.details?.[0]?.reason || '';

  // 1. Authentication / Key Invalid
  if (
    reason === 'API_KEY_INVALID' ||
    googleCode === 401 ||
    googleCode === 403 ||
    (googleCode === 400 && /API key not valid/i.test(rawMessage))
  ) {
    return AiError.authError(feature);
  }

  // 2. Rate Limits & Quotas (429 or RESOURCE_EXHAUSTED)
  if (googleCode === 429 || googleStatus === 'RESOURCE_EXHAUSTED' || /quota|rate limit|resource has been exhausted/i.test(rawMessage)) {
    // Distinguish global daily quota exhaustion from temporary minute-level rate limits
    if (/daily|per day|day limit/i.test(rawMessage)) {
      return AiError.globalQuotaExhausted(feature);
    }
    return AiError.rateLimitExceeded(feature);
  }

  // 3. Provider Transient / Server Errors (500, 502, 503, 504)
  if (googleCode === 503 || googleCode === 502 || googleCode === 504 || /unavailable|overloaded|timeout/i.test(rawMessage)) {
    return AiError.providerUnavailable(feature);
  }

  // 4. Network failures
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(rawMessage)) {
    return AiError.providerUnavailable(feature, 'AI provider network connection failed. Please try again.');
  }

  // 5. Bad request / Invalid input
  if (googleCode === 400) {
    return AiError.invalidInput(sanitizeErrorMessage(rawMessage), feature);
  }

  // Default fallback
  return new AiError({
    code: AI_ERROR_CODES.PROVIDER_UNAVAILABLE,
    message: sanitizeErrorMessage(rawMessage) || 'Unexpected AI service error',
    statusCode: status >= 400 && status < 600 ? status : 500,
    feature,
    isTemporary: true,
    isRetryable: false
  });
}

export default {
  AI_ERROR_CODES,
  AiError,
  sanitizeErrorMessage,
  normalizeGeminiError
};
