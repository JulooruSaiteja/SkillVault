import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../src/app.js';
import config from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { ApiError } from '../src/utils/ApiError.js';
import { logger, sanitize, sanitizeString } from '../src/utils/logger.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

describe('Phase 17 — Request Validation, Error Handling, and Safe Logging Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await connectDatabase();

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDatabase();
  });

  describe('Centralized Error Format & Error Handling Middleware', () => {
    it('should format ApiError with uniform response envelope', () => {
      let capturedStatus = null;
      let capturedBody = null;

      const mockRes = {
        status(code) {
          capturedStatus = code;
          return this;
        },
        json(body) {
          capturedBody = body;
          return this;
        }
      };

      const customErr = ApiError.badRequest('Custom validation failure', [
        { field: 'email', message: 'Email already registered' }
      ]);

      errorHandler(customErr, { method: 'POST', originalUrl: '/test' }, mockRes, () => {});

      assert.equal(capturedStatus, 400);
      assert.equal(capturedBody.success, false);
      assert.equal(capturedBody.message, 'Custom validation failure');
      assert.equal(Array.isArray(capturedBody.errors), true);
      assert.equal(capturedBody.errors.length, 1);
      assert.equal(capturedBody.errors[0].field, 'email');
    });

    it('should map Mongoose ValidationError to HTTP 400 with field errors', () => {
      let capturedStatus = null;
      let capturedBody = null;

      const mockRes = {
        status(code) {
          capturedStatus = code;
          return this;
        },
        json(body) {
          capturedBody = body;
          return this;
        }
      };

      const mongooseValidationError = {
        name: 'ValidationError',
        errors: {
          title: { path: 'title', message: 'Path `title` is required.' },
          duration: { path: 'duration', message: 'Duration must be positive.' }
        }
      };

      errorHandler(mongooseValidationError, { method: 'POST', originalUrl: '/api/videos' }, mockRes, () => {});

      assert.equal(capturedStatus, 400);
      assert.equal(capturedBody.success, false);
      assert.equal(capturedBody.message, 'Validation failed');
      assert.equal(capturedBody.errors.length, 2);
      assert.deepEqual(capturedBody.errors.map(e => e.field).sort(), ['duration', 'title']);
    });

    it('should map Mongoose CastError (invalid ObjectId) to HTTP 400', () => {
      let capturedStatus = null;
      let capturedBody = null;

      const mockRes = {
        status(code) {
          capturedStatus = code;
          return this;
        },
        json(body) {
          capturedBody = body;
          return this;
        }
      };

      const castError = {
        name: 'CastError',
        path: '_id',
        value: 'not-a-valid-object-id'
      };

      errorHandler(castError, { method: 'GET', originalUrl: '/api/skills/not-a-valid-object-id' }, mockRes, () => {});

      assert.equal(capturedStatus, 400);
      assert.equal(capturedBody.success, false);
      assert.match(capturedBody.message, /invalid identifier format/i);
      assert.equal(capturedBody.errors[0].field, '_id');
    });

    it('should map MongoDB E11000 duplicate key error to HTTP 409 Conflict', () => {
      let capturedStatus = null;
      let capturedBody = null;

      const mockRes = {
        status(code) {
          capturedStatus = code;
          return this;
        },
        json(body) {
          capturedBody = body;
          return this;
        }
      };

      const duplicateError = {
        code: 11000,
        keyPattern: { slug: 1 },
        keyValue: { slug: 'computer-systems' }
      };

      errorHandler(duplicateError, { method: 'POST', originalUrl: '/api/categories' }, mockRes, () => {});

      assert.equal(capturedStatus, 409);
      assert.equal(capturedBody.success, false);
      assert.match(capturedBody.message, /duplicate value entered for slug/i);
      assert.equal(capturedBody.errors[0].field, 'slug');
    });

    it('should return HTTP 400 for malformed JSON request bodies', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"email": "test@example.com", "password": invalid_json_here}'
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Malformed JSON in request body');
    });

    it('should return HTTP 404 for unknown endpoints in standardized envelope', async () => {
      const res = await fetch(`${baseUrl}/api/completely-unknown-route-12345`);
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.success, false);
      assert.match(body.message, /Route not found/i);
    });
  });

  describe('Safe Server Logging and Secret Sanitization', () => {
    it('should redact sensitive password fields from objects', () => {
      const input = {
        email: 'user@example.com',
        password: 'superSecretPassword123!',
        currentPassword: 'oldPassword456!',
        newPassword: 'newPassword789!',
        nested: {
          token: 'some-jwt-token-value',
          apiKey: 'AIzaSyD-1234567890abcdef',
          safeField: 'computing-science'
        }
      };

      const result = sanitize(input);

      assert.equal(result.email, 'user@example.com');
      assert.equal(result.password, '[REDACTED]');
      assert.equal(result.currentPassword, '[REDACTED]');
      assert.equal(result.newPassword, '[REDACTED]');
      assert.equal(result.nested.token, '[REDACTED]');
      assert.equal(result.nested.apiKey, '[REDACTED]');
      assert.equal(result.nested.safeField, 'computing-science');
    });

    it('should redact Bearer authorization tokens from log strings', () => {
      const logMessage = 'User authorized with header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID';
      const sanitized = sanitizeString(logMessage);

      assert.equal(sanitized.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), false);
      assert.match(sanitized, /Bearer \[REDACTED\]/);
    });

    it('should redact Gemini API keys from log strings', () => {
      const logMessage = 'Gemini client failed with AIzaSyD3xY-example_api_key_456789123456';
      const sanitized = sanitizeString(logMessage);

      assert.equal(sanitized.includes('AIzaSyD3xY-example_api_key_456789123456'), false);
      assert.match(sanitized, /\[REDACTED_API_KEY\]/);
    });

    it('should redact query string secrets from URL logs', () => {
      const url = '/api/webhook?key=AIzaSySecretKey123&token=myTokenVal&name=algorithms';
      const sanitized = sanitizeString(url);

      assert.equal(sanitized.includes('AIzaSySecretKey123'), false);
      assert.equal(sanitized.includes('myTokenVal'), false);
      assert.match(sanitized, /key=\[REDACTED\]/);
      assert.match(sanitized, /token=\[REDACTED\]/);
      assert.match(sanitized, /name=algorithms/);
    });

    it('should redact embedded credentials from MongoDB URIs', () => {
      const dbUri = 'mongodb+srv://admin_user:SuperSecretMongoPassword@cluster0.skillvault.net/skillvault';
      const sanitized = sanitizeString(dbUri);

      assert.equal(sanitized.includes('SuperSecretMongoPassword'), false);
      assert.match(sanitized, /mongodb\+srv:\/\/admin_user:\[REDACTED\]@cluster0\.skillvault\.net\/skillvault/);
    });

    it('should sanitize Error objects without throwing or leaking sensitive stack text', () => {
      const errorWithSecret = new Error('Database connect failed for mongodb://user:myDbPassword123@localhost:27017');
      const sanitized = sanitize(errorWithSecret);

      assert.equal(sanitized.message.includes('myDbPassword123'), false);
      assert.match(sanitized.message, /\[REDACTED\]/);
    });
  });
});
