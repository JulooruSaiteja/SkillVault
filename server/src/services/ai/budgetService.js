import { AiGlobalUsage } from '../../models/AiGlobalUsage.js';
import { AiUserUsage } from '../../models/AiUserUsage.js';
import { getAiConfig, USER_DAILY_LIMITS } from '../../config/aiConfig.js';
import { getUtcDayString, getUtcNextReset } from '../../utils/utcDate.js';
import { AiError } from './geminiError.js';

/**
 * Concurrency-Safe Durable AI Budget & Usage Tracking Service.
 *
 * Enforces:
 * 1. Global Daily Budget: Atomically reserves quota before sending API attempts,
 *    counting every attempt (including retries) against the daily limit.
 * 2. Per-User Daily Allowance: Tracks successful generations per user per UTC day.
 * 3. Daily Reset: Usage counters reset at 00:00 UTC.
 */

/**
 * Atomically reserve 1 attempt slot from the global daily budget for a feature.
 * Must be called BEFORE dispatching an API attempt.
 *
 * @param {string} feature - 'notes' or 'quiz'
 * @param {string} [utcDay] - Target UTC day (defaults to current UTC day)
 * @returns {Promise<{ success: boolean, attemptNumber: number, remaining: number, utcDay: string }>}
 * @throws {AiError} If daily global quota is exhausted
 */
export async function reserveGlobalAttempt(feature, utcDay = getUtcDayString()) {
  const featConfig = getAiConfig(feature);
  const dailyBudget = featConfig.dailyBudget;

  // 1. Ensure the tracking document exists for this feature and day
  await AiGlobalUsage.updateOne(
    { feature, utcDay },
    {
      $setOnInsert: {
        feature,
        model: featConfig.model,
        utcDay,
        attempts: 0
      }
    },
    { upsert: true }
  );

  // 2. Atomically increment attempts ONLY if currently under dailyBudget
  const updated = await AiGlobalUsage.findOneAndUpdate(
    {
      feature,
      utcDay,
      attempts: { $lt: dailyBudget }
    },
    {
      $inc: { attempts: 1 },
      $set: {
        lastAttemptAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      returnDocument: 'after'
    }
  );

  // If null, the document matched { feature, utcDay } but attempts was already >= dailyBudget
  if (!updated) {
    throw AiError.globalQuotaExhausted(feature, getUtcNextReset());
  }

  const remaining = Math.max(0, dailyBudget - updated.attempts);

  return {
    success: true,
    attemptNumber: updated.attempts,
    remaining,
    utcDay
  };
}

/**
 * Release a previously reserved attempt slot if an attempt was aborted or cancelled
 * prior to dispatching to the external network.
 *
 * @param {string} feature - 'notes' or 'quiz'
 * @param {string} [utcDay] - Target UTC day (defaults to current UTC day)
 * @returns {Promise<boolean>}
 */
export async function releaseGlobalAttempt(feature, utcDay = getUtcDayString()) {
  const result = await AiGlobalUsage.updateOne(
    {
      feature,
      utcDay,
      attempts: { $gt: 0 }
    },
    {
      $inc: { attempts: -1 },
      $set: { updatedAt: new Date() }
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Retrieve the current global daily budget status for a feature.
 *
 * @param {string} feature - 'notes' or 'quiz'
 * @param {string} [utcDay] - Target UTC day (defaults to current UTC day)
 * @returns {Promise<{ feature: string, utcDay: string, model: string, attempts: number, dailyBudget: number, remaining: number, isExhausted: boolean, resetsAt: Date }>}
 */
export async function getGlobalBudgetStatus(feature, utcDay = getUtcDayString()) {
  const featConfig = getAiConfig(feature);
  const doc = await AiGlobalUsage.findOne({ feature, utcDay }).lean();
  const attempts = doc ? doc.attempts : 0;
  const remaining = Math.max(0, featConfig.dailyBudget - attempts);
  const isExhausted = attempts >= featConfig.dailyBudget;

  return {
    feature,
    utcDay,
    model: featConfig.model,
    attempts,
    dailyBudget: featConfig.dailyBudget,
    remaining,
    isExhausted,
    resetsAt: getUtcNextReset()
  };
}

/**
 * Check whether an authenticated user has remaining daily generation allowance.
 * Notes: 1 successful generation per UTC day
 * Quiz: 2 successful generations per UTC day
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} feature - 'notes' or 'quiz'
 * @param {string} [utcDay] - Target UTC day (defaults to current UTC day)
 * @returns {Promise<{ allowed: boolean, used: number, limit: number, resetsAt: Date }>}
 */
export async function checkUserAllowance(userId, feature, utcDay = getUtcDayString()) {
  if (!userId) {
    throw new Error('userId is required to check user allowance');
  }

  const limit = USER_DAILY_LIMITS[feature];
  if (!limit) {
    throw new Error(`No user limit configured for feature: ${feature}`);
  }

  const doc = await AiUserUsage.findOne({ user: userId, feature, utcDay }).lean();
  const used = doc ? doc.successCount : 0;
  const allowed = used < limit;

  return {
    allowed,
    used,
    limit,
    resetsAt: getUtcNextReset()
  };
}

/**
 * Record a successful generation for an authenticated user.
 * Atomically increments user's daily success count.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} feature - 'notes' or 'quiz'
 * @param {string} [utcDay] - Target UTC day (defaults to current UTC day)
 * @returns {Promise<{ used: number, limit: number }>}
 */
export async function recordUserSuccess(userId, feature, utcDay = getUtcDayString()) {
  if (!userId) {
    throw new Error('userId is required to record user success');
  }

  const limit = USER_DAILY_LIMITS[feature];
  const doc = await AiUserUsage.findOneAndUpdate(
    { user: userId, feature, utcDay },
    {
      $inc: { successCount: 1 },
      $set: {
        lastSuccessAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      upsert: true,
      returnDocument: 'after'
    }
  );

  return {
    used: doc.successCount,
    limit
  };
}

export default {
  reserveGlobalAttempt,
  releaseGlobalAttempt,
  getGlobalBudgetStatus,
  checkUserAllowance,
  recordUserSuccess
};
