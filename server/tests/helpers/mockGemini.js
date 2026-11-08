/**
 * Mock Gemini Client for Safe Testing without Live API Requests or Credentials.
 * Conforms to the @google/genai interface: ai.models.generateContent({ model, contents, config })
 */
export class MockGeminiClient {
  constructor(options = {}) {
    this.calls = [];
    this.callCount = 0;
    this.defaultResponse = options.defaultResponse || {
      text: 'Mock generated content from Gemini'
    };
    this.behaviorQueue = options.behaviorQueue ? [...options.behaviorQueue] : null;
    this.delayMs = options.delayMs || 0;
  }

  get models() {
    return {
      generateContent: async ({ model, contents, config: genConfig }) => {
        this.callCount++;
        const callInfo = {
          model,
          contents,
          config: genConfig,
          timestamp: new Date()
        };
        this.calls.push(callInfo);

        if (this.delayMs > 0) {
          await new Promise((res) => setTimeout(res, this.delayMs));
        }

        // Check for queued behaviors (e.g. fail first, succeed second)
        if (this.behaviorQueue && this.behaviorQueue.length > 0) {
          const nextBehavior = this.behaviorQueue.shift();
          if (typeof nextBehavior === 'function') {
            return nextBehavior(callInfo);
          }
          if (nextBehavior instanceof Error) {
            throw nextBehavior;
          }
          return nextBehavior;
        }

        return this.defaultResponse;
      }
    };
  }

  reset() {
    this.calls = [];
    this.callCount = 0;
    this.behaviorQueue = null;
  }

  static createRateLimitError() {
    const error = new Error(JSON.stringify({
      error: {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        message: 'Resource has been exhausted (e.g. check quota).'
      }
    }));
    error.status = 429;
    return error;
  }

  static createProviderUnavailableError() {
    const error = new Error(JSON.stringify({
      error: {
        code: 503,
        status: 'UNAVAILABLE',
        message: 'The model is overloaded. Please try again later.'
      }
    }));
    error.status = 503;
    return error;
  }

  static createInvalidApiKeyError() {
    const error = new Error(JSON.stringify({
      error: {
        code: 400,
        status: 'INVALID_ARGUMENT',
        message: 'API key not valid. Please pass a valid API key.',
        details: [{ reason: 'API_KEY_INVALID' }]
      }
    }));
    error.status = 400;
    return error;
  }
}

export function createMockGeminiClient(options) {
  return new MockGeminiClient(options);
}

export default MockGeminiClient;
