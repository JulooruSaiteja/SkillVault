import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ApiError from '../src/utils/ApiError.js';
import ApiResponse from '../src/utils/ApiResponse.js';
import slugify from '../src/utils/slugify.js';
import { getCookieOptions } from '../src/utils/token.js';

describe('Backend Utility Classes', () => {
  describe('ApiError', () => {
    it('should create an ApiError with custom status and message', () => {
      const err = new ApiError(400, 'Custom error', ['field1']);
      assert.equal(err.name, 'ApiError');
      assert.equal(err.statusCode, 400);
      assert.equal(err.message, 'Custom error');
      assert.deepEqual(err.errors, ['field1']);
      assert.equal(err.isOperational, true);
    });

    it('should support static factory methods with correct HTTP status codes', () => {
      assert.equal(ApiError.badRequest('Invalid').statusCode, 400);
      assert.equal(ApiError.unauthorized().statusCode, 401);
      assert.equal(ApiError.forbidden().statusCode, 403);
      assert.equal(ApiError.notFound('Missing').statusCode, 404);
      assert.equal(ApiError.conflict('Exists').statusCode, 409);
      assert.equal(ApiError.tooManyRequests().statusCode, 429);
      assert.equal(ApiError.internal().statusCode, 500);
    });
  });

  describe('ApiResponse', () => {
    it('should create a uniform response envelope', () => {
      const response = new ApiResponse(200, 'Fetched', { id: 1 });
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, {
        success: true,
        message: 'Fetched',
        data: { id: 1 }
      });
    });

    it('should format responses without payload correctly', () => {
      const response = new ApiResponse(200, 'Success');
      assert.deepEqual(response.body, {
        success: true,
        message: 'Success'
      });
    });
  });

  describe('slugify', () => {
    it('should convert strings to lowercase kebab-case slugs', () => {
      assert.equal(slugify('Web Development & Tools'), 'web-development-tools');
      assert.equal(slugify('  Data Science 101: Python  '), 'data-science-101-python');
      assert.equal(slugify('C++ & C# Programming!'), 'c-c-programming');
      assert.equal(slugify('Multiple---Hyphens___And Spaces'), 'multiple-hyphens-and-spaces');
    });

    it('should handle empty or non-string inputs gracefully', () => {
      assert.equal(slugify(''), '');
      assert.equal(slugify(null), '');
      assert.equal(slugify(undefined), '');
    });
  });

  describe('getCookieOptions (Browser-Session Auth)', () => {
    it('should configure an HTTP-only browser-session cookie without maxAge or expires', () => {
      const options = getCookieOptions();
      assert.equal(options.httpOnly, true);
      assert.equal(options.sameSite, 'lax');
      assert.equal(options.maxAge, undefined, 'maxAge must be omitted for browser session lifecycle');
      assert.equal(options.expires, undefined, 'expires must be omitted for browser session lifecycle');
    });
  });
});
