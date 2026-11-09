/**
 * SkillVault API Service Layer
 * Centralized API client with environment variable configuration,
 * credentials inclusion for HttpOnly cookie sessions, and uniform error handling.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status = 500, data = null, meta = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = meta.code || (data && typeof data === 'object' ? data.code : null);
    this.errors = (data && typeof data === 'object' && Array.isArray(data.errors)) ? data.errors : [];
    this.isRetryable = meta.isRetryable ?? (data && typeof data === 'object' && typeof data.isRetryable === 'boolean'
      ? data.isRetryable
      : (status === 0 || status === 429 || status === 503));
    this.retryAfterMs = meta.retryAfterMs ?? (data && typeof data === 'object' ? data.retryAfterMs : null);
    this.resetsAt = meta.resetsAt ?? (data && typeof data === 'object' ? data.resetsAt : null);
    this.isNetworkError = status === 0;
    this.isAuthError = status === 401;
    this.isServerError = status >= 500;
  }
}

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Perform an HTTP request to the SkillVault backend API
 * @param {string} endpoint - API path (e.g. '/auth/me')
 * @param {RequestInit & { timeoutMs?: number }} [options] - Fetch options
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    Accept: 'application/json'
  };

  if (options.body && typeof options.body === 'string') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Setup timeout if external signal not supplied
  let timeoutId = null;
  let signal = options.signal;
  if (!signal) {
    const controller = new AbortController();
    signal = controller.signal;
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    timeoutId = setTimeout(() => {
      controller.abort(new Error('REQUEST_TIMEOUT'));
    }, timeoutMs);
  }

  const config = {
    ...options,
    signal,
    credentials: options.credentials || 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (responseData && typeof responseData === 'object' && responseData.message) ||
        (responseData && typeof responseData === 'object' && responseData.error) ||
        (typeof responseData === 'string' && responseData) ||
        `HTTP Error ${response.status}: ${response.statusText}`;

      // Notify application if an authenticated session expired unexpectedly
      if (
        typeof window !== 'undefined' &&
        response.status === 401 &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/register') &&
        !endpoint.includes('/auth/me')
      ) {
        window.dispatchEvent(
          new CustomEvent('skillvault:session-expired', {
            detail: {
              message: errorMessage,
              code: responseData?.code || 'TOKEN_EXPIRED'
            }
          })
        );
      }

      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (err) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (err instanceof ApiError) {
      throw err;
    }

    // Handle user or component intentional abort
    if (err.name === 'AbortError' && err.message !== 'REQUEST_TIMEOUT') {
      throw err;
    }

    if (err.message === 'REQUEST_TIMEOUT' || err.name === 'TimeoutError') {
      throw new ApiError(
        'Request timed out. The server took too long to respond. Please try again.',
        0,
        null,
        { code: 'REQUEST_TIMEOUT', isRetryable: true }
      );
    }

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const friendlyMsg = isOffline
      ? 'You appear to be offline. Please check your internet connection.'
      : 'Unable to connect to SkillVault server. Please check your network or try again shortly.';

    throw new ApiError(friendlyMsg, 0, null, {
      code: isOffline ? 'OFFLINE' : 'NETWORK_ERROR',
      isRetryable: true
    });
  }
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, data, options) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    }),
  put: (endpoint, data, options) =>
    apiRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  patch: (endpoint, data, options) =>
    apiRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  delete: (endpoint, options) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' })
};

export default api;
