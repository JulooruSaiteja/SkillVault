import { GoogleGenAI } from '@google/genai';
import config from '../../config/env.js';
import { getAiConfig, AI_FEATURES } from '../../config/aiConfig.js';
import { AiError } from './geminiError.js';

let defaultClientInstance = null;
let lastApiKey = null;
let injectedClient = null;

/**
 * Creates a new GoogleGenAI client instance with standard configuration.
 *
 * @param {object} [options={}]
 * @param {string} [options.apiKey]
 * @returns {GoogleGenAI}
 */
export function createGeminiClient(options = {}) {
  const apiKey = options.apiKey || config.geminiApiKey;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw AiError.authError();
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Returns the active Gemini client instance.
 * If a mock client was injected (e.g. for testing), returns that client.
 * Otherwise, lazily creates and caches the default client.
 *
 * @returns {object} GoogleGenAI client or injected mock
 */
export function getGeminiClient() {
  if (injectedClient) {
    return injectedClient;
  }

  const currentKey = config.geminiApiKey;
  if (!defaultClientInstance || lastApiKey !== currentKey) {
    defaultClientInstance = createGeminiClient();
    lastApiKey = currentKey;
  }

  return defaultClientInstance;
}

/**
 * Inject a mock or alternative client instance (used for testing without live API keys).
 *
 * @param {object|null} client
 */
export function setGeminiClient(client) {
  injectedClient = client;
}

/**
 * Reset any cached or injected client instance.
 */
export function resetGeminiClient() {
  injectedClient = null;
  defaultClientInstance = null;
  lastApiKey = null;
}

/**
 * Retrieve the configured Gemini model name for a specific feature.
 *
 * @param {string} feature - 'notes' or 'quiz'
 * @returns {string} Model ID, e.g. 'gemini-3.8-flash' or 'gemini-3.1-flash-lite'
 */
export function getModelForFeature(feature) {
  const featConfig = getAiConfig(feature);
  return featConfig.model;
}

export default {
  createGeminiClient,
  getGeminiClient,
  setGeminiClient,
  resetGeminiClient,
  getModelForFeature
};
