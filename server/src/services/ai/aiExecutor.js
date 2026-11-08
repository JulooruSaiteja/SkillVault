import { reserveGlobalAttempt, checkUserAllowance } from './budgetService.js';
import { normalizeGeminiError, AiError } from './geminiError.js';
import { getAiConfig } from '../../config/aiConfig.js';

/**
 * Executes an AI operation with durable budget enforcement, attempt accounting,
 * retry management, and centralized error normalization.
 *
 * Guarantees:
 * - Concurrency-safe global daily budget reservation before dispatch.
 * - Every attempt, including each retry, is accounted for against the global daily quota.
 * - Retries cannot bypass accounting.
 * - User daily generation allowance pre-check (when userId provided).
 * - Centralized error mapping with sensitive credential redaction.
 *
 * @param {object} params
 * @param {string} params.feature - 'notes' or 'quiz'
 * @param {string|mongoose.Types.ObjectId} [params.userId] - Authenticated user ID (optional)
 * @param {Function} params.operation - Async function executing the Gemini call: ({ attemptNumber }) => Promise<any>
 * @param {number} [params.maxRetries=0] - Number of retries on transient errors (each retry reserves quota)
 * @param {number} [params.retryDelayMs=200] - Base delay before retrying
 * @returns {Promise<any>} Result returned by the operation
 */
export async function executeAiRequest({
  feature,
  userId = null,
  operation,
  maxRetries = 0,
  retryDelayMs = 200,
  utcDay = undefined
}) {
  if (typeof operation !== 'function') {
    throw new TypeError('operation must be an async function');
  }

  const featConfig = getAiConfig(feature);

  // 1. Check user allowance if userId is provided
  if (userId) {
    const userAllowance = await checkUserAllowance(userId, feature, utcDay);
    if (!userAllowance.allowed) {
      throw AiError.userQuotaExhausted(feature, userAllowance.limit, userAllowance.resetsAt);
    }
  }

  let attempt = 0;
  const totalAttemptsAllowed = 1 + Math.max(0, maxRetries);

  while (attempt < totalAttemptsAllowed) {
    // 2. Concurrency-safe reservation before sending request
    // Count each actual attempt against the global budget
    const reservation = await reserveGlobalAttempt(feature, utcDay);

    try {
      const result = await operation({
        attemptNumber: reservation.attemptNumber,
        remainingBudget: reservation.remaining,
        model: featConfig.model
      });

      return result;
    } catch (err) {
      attempt++;
      const normalized = normalizeGeminiError(err, feature);

      // Check if retry is appropriate
      const canRetry = attempt < totalAttemptsAllowed && normalized.isRetryable;

      if (canRetry) {
        // Backoff delay before retry
        const backoff = retryDelayMs * attempt;
        await new Promise((res) => setTimeout(res, backoff));
        // Loop will reserve next attempt from budget
        continue;
      }

      throw normalized;
    }
  }
}

export default {
  executeAiRequest
};
