/**
 * Centralized safe logger and sanitization utility for SkillVault.
 *
 * Ensures all logged strings, objects, and error stacks strictly omit secrets,
 * passwords, JWT tokens, API keys, and authentication headers.
 */

const SENSITIVE_KEY_PATTERN = /^(password|currentpassword|newpassword|confirmpassword|token|refreshtoken|secret|jwtsecret|cookiesecret|authorization|apikey|geminiapikey)$/i;

const BEARER_REGEX = /bearer\s+[a-zA-Z0-9_\-\.]+/gi;
const JWT_REGEX = /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const GEMINI_KEY_REGEX = /AIza[0-9A-Za-z\-_]{10,50}/g;
const QUERY_SECRET_REGEX = /([?&](?:token|password|secret|key|apiKey)=)[^&\s]+/gi;
const MONGO_URI_REGEX = /(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/gi;

/**
 * Redacts sensitive substrings from strings.
 *
 * @param {string} str
 * @returns {string} Sanitized string
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(BEARER_REGEX, 'Bearer [REDACTED]')
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(GEMINI_KEY_REGEX, '[REDACTED_API_KEY]')
    .replace(QUERY_SECRET_REGEX, '$1[REDACTED]')
    .replace(MONGO_URI_REGEX, '$1[REDACTED]$3');
}

/**
 * Recursively deep-sanitizes objects, arrays, and primitive values.
 *
 * @param {*} data
 * @param {WeakSet} [seen] - Cycle prevention set
 * @returns {*} Sanitized copy of data
 */
export function sanitize(data, seen = new WeakSet()) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (typeof data !== 'object') {
    return data;
  }

  // Prevent circular references
  if (seen.has(data)) {
    return '[Circular]';
  }
  seen.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item, seen));
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: sanitizeString(data.message),
      stack: sanitizeString(data.stack || '')
    };
  }

  const sanitizedObj = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitizedObj[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitizedObj[key] = sanitize(value, seen);
    } else if (typeof value === 'string') {
      sanitizedObj[key] = sanitizeString(value);
    } else {
      sanitizedObj[key] = value;
    }
  }

  return sanitizedObj;
}

/**
 * Format arguments safely for console logging.
 *
 * @param {any[]} args
 * @returns {any[]}
 */
function formatArgs(args) {
  return args.map((arg) => {
    if (typeof arg === 'string') {
      return sanitizeString(arg);
    }
    return sanitize(arg);
  });
}

export const logger = {
  sanitize,
  sanitizeString,
  log(...args) {
    console.log(...formatArgs(args));
  },
  info(...args) {
    console.info(...formatArgs(args));
  },
  warn(...args) {
    console.warn(...formatArgs(args));
  },
  error(...args) {
    console.error(...formatArgs(args));
  }
};

export default logger;
