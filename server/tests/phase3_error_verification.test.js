import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../src/utils/ApiError.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requireAuth, requireAdmin } from '../src/middleware/auth.js';
import { signToken } from '../src/utils/token.js';
import { AiError, AI_ERROR_CODES } from '../src/services/ai/geminiError.js';
import { AI_FEATURES } from '../src/config/aiConfig.js';

describe('Phase 3 — Comprehensive Error Handling Verification Suite', () => {

  function createMockResponse() {
    let capturedStatus = null;
    let capturedBody = null;
    let capturedHeaders = {};

    return {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      },
      setHeader(name, val) {
        capturedHeaders[name] = val;
        return this;
      },
      getStatus() {
        return capturedStatus;
      },
      getBody() {
        return capturedBody;
      },
      getHeaders() {
        return capturedHeaders;
      }
    };
  }

  // 1. Centralized Error Normalizer & Standardized Codes
  describe('Standardized API Error Codes and Status Envelopes', () => {
    it('should format ApiError with code, message, statusCode and isRetryable', () => {
      const res = createMockResponse();
      const err = ApiError.badRequest('Invalid submission format', [
        { field: 'email', message: 'Email is required' }
      ]);

      errorHandler(err, { method: 'POST', originalUrl: '/api/test' }, res, () => {});

      assert.equal(res.getStatus(), 400);
      const body = res.getBody();
      assert.equal(body.success, false);
      assert.equal(body.code, 'VALIDATION_ERROR');
      assert.equal(body.statusCode, 400);
      assert.equal(body.message, 'Invalid submission format');
      assert.equal(body.isRetryable, false);
      assert.equal(body.errors.length, 1);
      assert.equal(body.errors[0].field, 'email');
    });

    it('should assign correct default error codes for all standard HTTP statuses', () => {
      const mappings = [
        { status: 401, err: ApiError.unauthorized('Auth required'), expectedCode: 'AUTHENTICATION_REQUIRED' },
        { status: 403, err: ApiError.forbidden('Forbidden'), expectedCode: 'FORBIDDEN_ACCESS' },
        { status: 404, err: ApiError.notFound('Not found'), expectedCode: 'RESOURCE_NOT_FOUND' },
        { status: 409, err: ApiError.conflict('Duplicate'), expectedCode: 'DUPLICATE_RESOURCE' },
        { status: 429, err: ApiError.tooManyRequests('Rate limited'), expectedCode: 'RATE_LIMIT_EXCEEDED' },
        { status: 503, err: ApiError.serviceUnavailable('Unavailable'), expectedCode: 'SERVICE_UNAVAILABLE' },
        { status: 500, err: ApiError.internal('Internal'), expectedCode: 'INTERNAL_ERROR' }
      ];

      for (const { status, err, expectedCode } of mappings) {
        const res = createMockResponse();
        errorHandler(err, { method: 'GET', originalUrl: '/api/resource' }, res, () => {});
        assert.equal(res.getStatus(), status);
        assert.equal(res.getBody().code, expectedCode);
      }
    });

    it('should handle MongoDB duplicate key errors (code 11000) gracefully', () => {
      const res = createMockResponse();
      const duplicateErr = {
        code: 11000,
        keyPattern: { email: 1 },
        keyValue: { email: 'student@example.com' }
      };

      errorHandler(duplicateErr, { method: 'POST', originalUrl: '/api/auth/register' }, res, () => {});

      assert.equal(res.getStatus(), 409);
      const body = res.getBody();
      assert.equal(body.code, 'DUPLICATE_RESOURCE');
      assert.equal(body.isRetryable, false);
      assert.match(body.message, /Duplicate value entered for email/);
      assert.equal(body.errors[0].field, 'email');
    });

    it('should map Mongoose CastError to HTTP 400 INVALID_IDENTIFIER', () => {
      const res = createMockResponse();
      const castErr = {
        name: 'CastError',
        path: 'videoId',
        value: 'invalid-id'
      };

      errorHandler(castErr, { method: 'GET', originalUrl: '/api/videos/invalid-id' }, res, () => {});

      assert.equal(res.getStatus(), 400);
      assert.equal(res.getBody().code, 'INVALID_IDENTIFIER');
      assert.equal(res.getBody().errors[0].field, 'videoId');
    });
  });

  // 2. Database Failures & Network Outage Normalization
  describe('Database Downtime and Network Error Normalization', () => {
    it('should convert MongooseServerSelectionError into HTTP 503 SERVICE_UNAVAILABLE', () => {
      const res = createMockResponse();
      const dbErr = {
        name: 'MongooseServerSelectionError',
        message: 'connect EACCES 127.0.0.1:27017'
      };

      errorHandler(dbErr, { method: 'GET', originalUrl: '/api/categories' }, res, () => {});

      assert.equal(res.getStatus(), 503);
      const body = res.getBody();
      assert.equal(body.code, 'SERVICE_UNAVAILABLE');
      assert.equal(body.message, 'Database service is temporarily unavailable. Please try again shortly.');
      assert.equal(body.isRetryable, true);
      assert.equal(body.retryAfterMs, 5000);
      assert.equal(res.getHeaders()['Retry-After'], 5);
    });

    it('should convert MongoNetworkError into HTTP 503 SERVICE_UNAVAILABLE', () => {
      const res = createMockResponse();
      const netErr = {
        name: 'MongoNetworkError',
        message: 'connection closed prematurely'
      };

      errorHandler(netErr, { method: 'GET', originalUrl: '/api/playlists' }, res, () => {});

      assert.equal(res.getStatus(), 503);
      assert.equal(res.getBody().code, 'SERVICE_UNAVAILABLE');
      assert.equal(res.getBody().isRetryable, true);
    });
  });

  // 3. Authentication & Session Expiration Differentiation
  describe('Authentication and Session Expiration Differentiation', () => {
    it('should reject requests with missing token using AUTHENTICATION_REQUIRED', async () => {
      const req = { cookies: {}, signedCookies: {}, headers: {} };
      let capturedError = null;

      await requireAuth(req, {}, (err) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof ApiError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, 'AUTHENTICATION_REQUIRED');
      assert.equal(capturedError.message, 'Authentication required to access this resource.');
    });

    it('should distinguish invalid/tampered tokens as INVALID_TOKEN', async () => {
      const req = {
        cookies: {},
        signedCookies: {},
        headers: { authorization: 'Bearer completely-invalid-tampered-token' }
      };
      let capturedError = null;

      await requireAuth(req, {}, (err) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof ApiError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, 'INVALID_TOKEN');
      assert.match(capturedError.message, /Invalid authentication token/);
    });

    it('should reject non-admin users with FORBIDDEN_ACCESS', () => {
      const req = { user: { role: 'learner' } };
      let capturedError = null;

      requireAdmin(req, {}, (err) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof ApiError);
      assert.equal(capturedError.statusCode, 403);
      assert.equal(capturedError.code, 'FORBIDDEN_ACCESS');
      assert.equal(capturedError.message, 'Admin privileges required');
    });
  });

  // 4. Gemini AI Error Normalization, Quotas, and Timeouts
  describe('Gemini AI Errors, Daily Quotas, and Rate Limiting', () => {
    it('should format user quota exhaustion with USER_QUOTA_EXHAUSTED code and resetsAt timestamp', () => {
      const nextReset = new Date(Date.now() + 3600000);
      const aiErr = AiError.userQuotaExhausted(AI_FEATURES.NOTES, 1, nextReset);

      const res = createMockResponse();
      errorHandler(aiErr, { method: 'POST', originalUrl: '/api/videos/v1/notes' }, res, () => {});

      assert.equal(res.getStatus(), 429);
      const body = res.getBody();
      assert.equal(body.code, AI_ERROR_CODES.USER_QUOTA_EXHAUSTED);
      assert.equal(body.isRetryable, false);
      assert.match(body.message, /daily limit of 1 notes generation/);
      assert.equal(body.resetsAt, nextReset);
    });

    it('should format global quota exhaustion with GLOBAL_QUOTA_EXHAUSTED code', () => {
      const nextReset = new Date(Date.now() + 7200000);
      const aiErr = AiError.globalQuotaExhausted(AI_FEATURES.QUIZ, nextReset);

      const res = createMockResponse();
      errorHandler(aiErr, { method: 'POST', originalUrl: '/api/videos/v1/quiz' }, res, () => {});

      assert.equal(res.getStatus(), 429);
      const body = res.getBody();
      assert.equal(body.code, AI_ERROR_CODES.GLOBAL_QUOTA_EXHAUSTED);
      assert.equal(body.isRetryable, false);
      assert.match(body.message, /daily global AI quota/);
    });

    it('should format temporary rate limit with RATE_LIMIT_EXCEEDED, retry delay and Retry-After header', () => {
      const aiErr = AiError.rateLimitExceeded(AI_FEATURES.NOTES, 10000);

      const res = createMockResponse();
      errorHandler(aiErr, { method: 'POST', originalUrl: '/api/videos/v1/notes' }, res, () => {});

      assert.equal(res.getStatus(), 429);
      const body = res.getBody();
      assert.equal(body.code, AI_ERROR_CODES.RATE_LIMIT_EXCEEDED);
      assert.equal(body.isRetryable, true);
      assert.equal(body.retryAfterMs, 10000);
      assert.equal(res.getHeaders()['Retry-After'], 10);
    });

    it('should format malformed AI output with AI_INVALID_OUTPUT code and 502 Bad Gateway', () => {
      const aiErr = AiError.invalidOutput('Malformed quiz json', AI_FEATURES.QUIZ);

      const res = createMockResponse();
      errorHandler(aiErr, { method: 'POST', originalUrl: '/api/videos/v1/quiz' }, res, () => {});

      assert.equal(res.getStatus(), 502);
      const body = res.getBody();
      assert.equal(body.code, AI_ERROR_CODES.INVALID_OUTPUT);
      assert.equal(body.message, 'Malformed quiz json');
      assert.equal(body.isRetryable, false);
    });

    it('should format AI provider unavailable with AI_PROVIDER_UNAVAILABLE and HTTP 503', () => {
      const aiErr = AiError.providerUnavailable(AI_FEATURES.NOTES);

      const res = createMockResponse();
      errorHandler(aiErr, { method: 'POST', originalUrl: '/api/videos/v1/notes' }, res, () => {});

      assert.equal(res.getStatus(), 503);
      const body = res.getBody();
      assert.equal(body.code, AI_ERROR_CODES.PROVIDER_UNAVAILABLE);
      assert.equal(body.isRetryable, true);
    });
  });
});
