import config from './env.js';

/**
 * Supported AI Feature Identifiers
 */
export const AI_FEATURES = Object.freeze({
  NOTES: 'notes',
  QUIZ: 'quiz'
});

export const AI_FEATURE_LIST = Object.freeze(Object.values(AI_FEATURES));

/**
 * Observed Google AI Studio Free-tier Quotas & Application Budgets
 * Notes: Gemini 3.8 Flash (5 RPM, 250k TPM, 20 RPD) -> Application budget: 20 attempts/UTC day
 * Quiz: Gemini 3.1 Flash Lite (15 RPM, 250k TPM, 500 RPD) -> Application budget: 500 attempts/UTC day
 */
export const OBSERVED_QUOTAS = Object.freeze({
  [AI_FEATURES.NOTES]: {
    rpm: 5,
    tpm: 250000,
    rpd: 20
  },
  [AI_FEATURES.QUIZ]: {
    rpm: 15,
    tpm: 250000,
    rpd: 500
  }
});

/**
 * Per-User Successful Generation Daily Limits
 * (Enforced during feature execution)
 */
export const USER_DAILY_LIMITS = Object.freeze({
  [AI_FEATURES.NOTES]: 1, // 1 successful generation per user per UTC day
  [AI_FEATURES.QUIZ]: 2   // 2 successful generations per user per UTC day
});

/**
 * Retrieve active configuration for an AI feature.
 * Reads environment overrides dynamically via config.
 *
 * @param {string} feature - 'notes' or 'quiz'
 * @returns {object} Feature configuration
 */
export function getAiConfig(feature) {
  if (!AI_FEATURE_LIST.includes(feature)) {
    throw new Error(`Unsupported AI feature: ${feature}. Must be one of: ${AI_FEATURE_LIST.join(', ')}`);
  }

  if (feature === AI_FEATURES.NOTES) {
    return {
      feature: AI_FEATURES.NOTES,
      model: config.geminiNotesModel,
      dailyBudget: config.geminiNotesDailyBudget,
      observedQuota: OBSERVED_QUOTAS[AI_FEATURES.NOTES],
      userDailyLimit: USER_DAILY_LIMITS[AI_FEATURES.NOTES]
    };
  }

  return {
    feature: AI_FEATURES.QUIZ,
    model: config.geminiQuizModel,
    dailyBudget: config.geminiQuizDailyBudget,
    observedQuota: OBSERVED_QUOTAS[AI_FEATURES.QUIZ],
    userDailyLimit: USER_DAILY_LIMITS[AI_FEATURES.QUIZ]
  };
}

export default {
  AI_FEATURES,
  AI_FEATURE_LIST,
  OBSERVED_QUOTAS,
  USER_DAILY_LIMITS,
  getAiConfig
};
