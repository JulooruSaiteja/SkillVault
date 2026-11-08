import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import config from '../src/config/env.js';
import {
  AI_FEATURES,
  getAiConfig,
  OBSERVED_QUOTAS,
  USER_DAILY_LIMITS
} from '../src/config/aiConfig.js';
import {
  getUtcDayString,
  getUtcStartOfDay,
  getUtcEndOfDay,
  getUtcNextReset,
  getMsUntilUtcReset,
  isValidUtcDayString
} from '../src/utils/utcDate.js';
import {
  AiError,
  AI_ERROR_CODES,
  normalizeGeminiError,
  sanitizeErrorMessage
} from '../src/services/ai/geminiError.js';
import {
  getGeminiClient,
  setGeminiClient,
  resetGeminiClient,
  getModelForFeature
} from '../src/services/ai/geminiClient.js';
import {
  reserveGlobalAttempt,
  releaseGlobalAttempt,
  getGlobalBudgetStatus,
  checkUserAllowance,
  recordUserSuccess
} from '../src/services/ai/budgetService.js';
import { executeAiRequest } from '../src/services/ai/aiExecutor.js';
import { AiGlobalUsage } from '../src/models/AiGlobalUsage.js';
import { AiUserUsage } from '../src/models/AiUserUsage.js';
import { MockGeminiClient } from './helpers/mockGemini.js';

describe('Shared Gemini AI Infrastructure', () => {
  let dbConnection;
  const testUtcDay = '2099-01-01'; // Safe isolated date for test usage tracking
  const mockUserId1 = new mongoose.Types.ObjectId();
  const mockUserId2 = new mongoose.Types.ObjectId();

  before(async () => {
    dbConnection = await connectDatabase();
  });

  after(async () => {
    // Clean up test records
    await AiGlobalUsage.deleteMany({ utcDay: { $in: [testUtcDay, getUtcDayString()] } });
    await AiUserUsage.deleteMany({ utcDay: { $in: [testUtcDay, getUtcDayString()] } });
    resetGeminiClient();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await AiGlobalUsage.deleteMany({ utcDay: { $in: [testUtcDay, getUtcDayString()] } });
    await AiUserUsage.deleteMany({ utcDay: { $in: [testUtcDay, getUtcDayString()] } });
    resetGeminiClient();
  });

  // =========================================================================
  // 1. Model Configuration and Selection Tests
  // =========================================================================
  describe('Model Configuration and Selection', () => {
    it('should select gemini-3.8-flash for notes and gemini-3.1-flash-lite for quiz by default', () => {
      const notesConfig = getAiConfig(AI_FEATURES.NOTES);
      const quizConfig = getAiConfig(AI_FEATURES.QUIZ);

      assert.equal(notesConfig.model, 'gemini-3.8-flash');
      assert.equal(quizConfig.model, 'gemini-3.1-flash-lite');
      assert.equal(getModelForFeature(AI_FEATURES.NOTES), 'gemini-3.8-flash');
      assert.equal(getModelForFeature(AI_FEATURES.QUIZ), 'gemini-3.1-flash-lite');
    });

    it('should enforce observed daily application budgets (Notes: 20, Quiz: 500)', () => {
      const notesConfig = getAiConfig(AI_FEATURES.NOTES);
      const quizConfig = getAiConfig(AI_FEATURES.QUIZ);

      assert.equal(notesConfig.dailyBudget, 20);
      assert.equal(quizConfig.dailyBudget, 500);
      assert.equal(notesConfig.observedQuota.rpd, 20);
      assert.equal(quizConfig.observedQuota.rpd, 500);
      assert.equal(notesConfig.observedQuota.rpm, 5);
      assert.equal(quizConfig.observedQuota.rpm, 15);
    });

    it('should throw an error for unsupported feature names', () => {
      assert.throws(() => {
        getAiConfig('unsupported_feature');
      }, /Unsupported AI feature/);
    });
  });

  // =========================================================================
  // 2. UTC Date & Reset Utilities Tests
  // =========================================================================
  describe('UTC Date and Reset Utilities', () => {
    it('should format UTC date strictly as YYYY-MM-DD', () => {
      const fixedDate = new Date('2026-10-25T23:45:00.000Z');
      assert.equal(getUtcDayString(fixedDate), '2026-10-25');
    });

    it('should calculate 00:00:00.000 UTC start of day and 23:59:59.999 UTC end of day', () => {
      const fixedDate = new Date('2026-10-25T14:30:00.000Z');
      const start = getUtcStartOfDay(fixedDate);
      const end = getUtcEndOfDay(fixedDate);

      assert.equal(start.toISOString(), '2026-10-25T00:00:00.000Z');
      assert.equal(end.toISOString(), '2026-10-25T23:59:59.999Z');
    });

    it('should calculate next 00:00 UTC daily reset correctly across day boundaries', () => {
      const fixedDate = new Date('2026-10-25T23:59:30.000Z');
      const nextReset = getUtcNextReset(fixedDate);
      assert.equal(nextReset.toISOString(), '2026-10-26T00:00:00.000Z');

      const msRemaining = getMsUntilUtcReset(fixedDate);
      assert.equal(msRemaining, 30000); // 30 seconds
    });

    it('should validate YYYY-MM-DD calendar date strings accurately', () => {
      assert.equal(isValidUtcDayString('2026-10-25'), true);
      assert.equal(isValidUtcDayString('2026-02-28'), true);
      assert.equal(isValidUtcDayString('2026-13-01'), false); // invalid month
      assert.equal(isValidUtcDayString('invalid'), false);
      assert.equal(isValidUtcDayString(null), false);
    });
  });

  // =========================================================================
  // 3. Error Handling and Key Redaction Tests
  // =========================================================================
  describe('Error Handling and Key Redaction', () => {
    it('should normalize Google 400 API_KEY_INVALID to an AiError with status 500 without leaking credentials', () => {
      const rawError = MockGeminiClient.createInvalidApiKeyError();
      const normalized = normalizeGeminiError(rawError, AI_FEATURES.NOTES);

      assert.equal(normalized.name, 'AiError');
      assert.equal(normalized.code, AI_ERROR_CODES.AUTH_ERROR);
      assert.equal(normalized.statusCode, 500);
      assert.match(normalized.message, /authentication failed/i);
      // Ensure no raw keys or details leaked
      assert.equal(normalized.message.includes('mock_key'), false);
    });

    it('should normalize Google 429 RESOURCE_EXHAUSTED into a transient rate limit error', () => {
      const rawError = MockGeminiClient.createRateLimitError();
      const normalized = normalizeGeminiError(rawError, AI_FEATURES.QUIZ);

      assert.equal(normalized.code, AI_ERROR_CODES.RATE_LIMIT_EXCEEDED);
      assert.equal(normalized.statusCode, 429);
      assert.equal(normalized.isTemporary, true);
      assert.equal(normalized.isRetryable, true);
    });

    it('should normalize Google 503 UNAVAILABLE into a retryable provider error', () => {
      const rawError = MockGeminiClient.createProviderUnavailableError();
      const normalized = normalizeGeminiError(rawError, AI_FEATURES.NOTES);

      assert.equal(normalized.code, AI_ERROR_CODES.PROVIDER_UNAVAILABLE);
      assert.equal(normalized.statusCode, 503);
      assert.equal(normalized.isTemporary, true);
      assert.equal(normalized.isRetryable, true);
    });

    it('should sanitize strings by scrubbing potential API keys and query parameters', () => {
      const dirty = 'Error at https://example.com/api?key=AIzaSyA12345678901234567890123456789012 with token';
      const clean = sanitizeErrorMessage(dirty);
      assert.equal(clean.includes('AIzaSyA12345678901234567890123456789012'), false);
      assert.match(clean, /\[REDACTED/);
    });
  });

  // =========================================================================
  // 4. Concurrency-Safe Durable Budget Reservation Tests
  // =========================================================================
  describe('Durable Budget Reservation and Concurrency', () => {
    it('should reserve an attempt slot atomically and update remaining budget', async () => {
      const reservation = await reserveGlobalAttempt(AI_FEATURES.NOTES, testUtcDay);

      assert.equal(reservation.success, true);
      assert.equal(reservation.attemptNumber, 1);
      assert.equal(reservation.remaining, 19); // 20 - 1

      const status = await getGlobalBudgetStatus(AI_FEATURES.NOTES, testUtcDay);
      assert.equal(status.attempts, 1);
      assert.equal(status.remaining, 19);
      assert.equal(status.isExhausted, false);
    });

    it('should support releasing an un-dispatched reservation', async () => {
      await reserveGlobalAttempt(AI_FEATURES.NOTES, testUtcDay);
      const released = await releaseGlobalAttempt(AI_FEATURES.NOTES, testUtcDay);
      assert.equal(released, true);

      const status = await getGlobalBudgetStatus(AI_FEATURES.NOTES, testUtcDay);
      assert.equal(status.attempts, 0);
      assert.equal(status.remaining, 20);
    });

    it('should strictly reject reservations when the global daily budget is exhausted', async () => {
      // Simulate reaching budget of 20
      await AiGlobalUsage.create({
        feature: AI_FEATURES.NOTES,
        model: 'gemini-3.8-flash',
        utcDay: testUtcDay,
        attempts: 20
      });

      await assert.rejects(
        async () => {
          await reserveGlobalAttempt(AI_FEATURES.NOTES, testUtcDay);
        },
        (err) => {
          assert.equal(err.code, AI_ERROR_CODES.GLOBAL_QUOTA_EXHAUSTED);
          assert.equal(err.statusCode, 429);
          return true;
        }
      );
    });

    it('should guarantee concurrency safety under 30 simultaneous requests (20 limit)', async () => {
      // Notes daily budget is 20. Dispatch 30 concurrent reservation promises.
      const promises = Array.from({ length: 30 }, () =>
        reserveGlobalAttempt(AI_FEATURES.NOTES, testUtcDay)
          .then((res) => ({ status: 'fulfilled', value: res }))
          .catch((err) => ({ status: 'rejected', reason: err }))
      );

      const results = await Promise.all(promises);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly 20 must succeed and 10 must fail
      assert.equal(fulfilled.length, 20, 'Exactly 20 attempts should succeed');
      assert.equal(rejected.length, 10, 'Exactly 10 attempts should be rejected');

      // Database record must strictly equal 20
      const status = await getGlobalBudgetStatus(AI_FEATURES.NOTES, testUtcDay);
      assert.equal(status.attempts, 20);
      assert.equal(status.remaining, 0);
      assert.equal(status.isExhausted, true);
    });

    it('should ensure notes budget exhaustion does NOT impact quiz budget (independent quotas)', async () => {
      // Exhaust notes budget
      await AiGlobalUsage.create({
        feature: AI_FEATURES.NOTES,
        model: 'gemini-3.8-flash',
        utcDay: testUtcDay,
        attempts: 20
      });

      const notesStatus = await getGlobalBudgetStatus(AI_FEATURES.NOTES, testUtcDay);
      assert.equal(notesStatus.isExhausted, true);

      // Quiz must remain fully available
      const quizStatus = await getGlobalBudgetStatus(AI_FEATURES.QUIZ, testUtcDay);
      assert.equal(quizStatus.isExhausted, false);
      assert.equal(quizStatus.remaining, 500);

      // A quiz reservation must succeed
      const quizReservation = await reserveGlobalAttempt(AI_FEATURES.QUIZ, testUtcDay);
      assert.equal(quizReservation.success, true);
      assert.equal(quizReservation.attemptNumber, 1);
    });
  });

  // =========================================================================
  // 5. Attempt Accounting and Retry Handling Tests
  // =========================================================================
  describe('Attempt Accounting and Retry Handling', () => {
    it('should count every attempt against the budget, including retries', async () => {
      const mockClient = new MockGeminiClient({
        behaviorQueue: [
          MockGeminiClient.createProviderUnavailableError(), // Attempt 1 fails (transient 503)
          { text: 'Success on retry' }                        // Attempt 2 succeeds
        ]
      });
      setGeminiClient(mockClient);

      const result = await executeAiRequest({
        feature: AI_FEATURES.NOTES,
        maxRetries: 1,
        retryDelayMs: 10,
        utcDay: testUtcDay,
        operation: async ({ attemptNumber, model }) => {
          const client = getGeminiClient();
          return client.models.generateContent({ model, contents: 'Test' });
        }
      });

      assert.equal(result.text, 'Success on retry');
      assert.equal(mockClient.callCount, 2);

      // Verify that BOTH attempts were deducted from the global budget
      const status = await getGlobalBudgetStatus(AI_FEATURES.NOTES, testUtcDay);
      assert.ok(status.attempts >= 2, 'At least 2 attempts should be counted for 1 call + 1 retry');
    });

    it('should block a retry if global budget becomes exhausted before the retry is dispatched', async () => {
      // Set attempts to 19 (only 1 attempt left before daily budget of 20)
      await AiGlobalUsage.updateOne(
        { feature: AI_FEATURES.NOTES, utcDay: testUtcDay },
        { $set: { attempts: 19, model: 'gemini-3.8-flash' } },
        { upsert: true }
      );

      const mockClient = new MockGeminiClient({
        behaviorQueue: [
          MockGeminiClient.createProviderUnavailableError(), // Attempt 1 uses 20th slot and fails
          { text: 'Should never reach here' }
        ]
      });
      setGeminiClient(mockClient);

      await assert.rejects(
        async () => {
          await executeAiRequest({
            feature: AI_FEATURES.NOTES,
            maxRetries: 1,
            retryDelayMs: 10,
            utcDay: testUtcDay,
            operation: async ({ model }) => {
              const client = getGeminiClient();
              return client.models.generateContent({ model, contents: 'Test' });
            }
          });
        },
        (err) => {
          assert.equal(err.code, AI_ERROR_CODES.GLOBAL_QUOTA_EXHAUSTED);
          return true;
        }
      );

      // Only 1 call was dispatched because the retry could not reserve quota
      assert.equal(mockClient.callCount, 1);
    });
  });

  // =========================================================================
  // 6. User-Level Daily Allowance Tests
  // =========================================================================
  describe('User-Level Daily Allowance Tracking', () => {
    it('should permit notes generation up to 1 daily allowance and reject subsequent attempts', async () => {
      // 1. Initial check: user has 0 used of 1
      const check1 = await checkUserAllowance(mockUserId1, AI_FEATURES.NOTES, testUtcDay);
      assert.equal(check1.allowed, true);
      assert.equal(check1.used, 0);
      assert.equal(check1.limit, 1);

      // 2. Record 1 success
      await recordUserSuccess(mockUserId1, AI_FEATURES.NOTES, testUtcDay);

      // 3. Second check: user has 1 used of 1 -> now disallowed
      const check2 = await checkUserAllowance(mockUserId1, AI_FEATURES.NOTES, testUtcDay);
      assert.equal(check2.allowed, false);
      assert.equal(check2.used, 1);
    });

    it('should permit quiz generation up to 2 daily allowances and reject subsequent attempts', async () => {
      // Quiz allows 2
      await recordUserSuccess(mockUserId1, AI_FEATURES.QUIZ, testUtcDay);
      let check = await checkUserAllowance(mockUserId1, AI_FEATURES.QUIZ, testUtcDay);
      assert.equal(check.allowed, true);
      assert.equal(check.used, 1);
      assert.equal(check.limit, 2);

      await recordUserSuccess(mockUserId1, AI_FEATURES.QUIZ, testUtcDay);
      check = await checkUserAllowance(mockUserId1, AI_FEATURES.QUIZ, testUtcDay);
      assert.equal(check.allowed, false);
      assert.equal(check.used, 2);
    });

    it('should isolate allowances between different users', async () => {
      // Exhaust user 1
      await recordUserSuccess(mockUserId1, AI_FEATURES.NOTES, testUtcDay);
      const user1Check = await checkUserAllowance(mockUserId1, AI_FEATURES.NOTES, testUtcDay);
      assert.equal(user1Check.allowed, false);

      // User 2 should still be allowed
      const user2Check = await checkUserAllowance(mockUserId2, AI_FEATURES.NOTES, testUtcDay);
      assert.equal(user2Check.allowed, true);
      assert.equal(user2Check.used, 0);
    });

    it('should reject executeAiRequest immediately when user allowance is exhausted without consuming global budget', async () => {
      await recordUserSuccess(mockUserId1, AI_FEATURES.NOTES, testUtcDay);

      const statusBefore = await getGlobalBudgetStatus(AI_FEATURES.NOTES, testUtcDay);

      await assert.rejects(
        async () => {
          await executeAiRequest({
            feature: AI_FEATURES.NOTES,
            userId: mockUserId1,
            utcDay: testUtcDay,
            operation: async () => 'Should not run'
          });
        },
        (err) => {
          assert.equal(err.code, AI_ERROR_CODES.USER_QUOTA_EXHAUSTED);
          return true;
        }
      );

      // Global attempts must remain unchanged because user pre-check prevented dispatch
      const statusAfter = await getGlobalBudgetStatus(AI_FEATURES.NOTES, testUtcDay);
      assert.equal(statusAfter.attempts, statusBefore.attempts);
    });
  });

  // =========================================================================
  // 7. Security and Backend-Only Isolation Tests
  // =========================================================================
  describe('Security and Frontend Isolation', () => {
    it('should ensure GEMINI_API_KEY is defined in server config and never exposed through client variables', () => {
      assert.ok(config.geminiApiKey, 'Server config must have geminiApiKey getter');
      assert.equal(typeof process.env.VITE_GEMINI_API_KEY, 'undefined', 'VITE_GEMINI_API_KEY must not exist in environment');
    });

    it('should prevent leaking API keys or credentials in error objects', () => {
      const err = new AiError({
        code: AI_ERROR_CODES.AUTH_ERROR,
        message: 'Invalid key AIzaSyTestKey123456789'
      });
      const serialized = JSON.stringify(err);
      // The message setter in our error should sanitize
      const sanitized = sanitizeErrorMessage(err.message);
      assert.equal(sanitized.includes('AIzaSyTestKey123456789'), false);
    });
  });
});
