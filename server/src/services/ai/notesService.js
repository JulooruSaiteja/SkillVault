import crypto from 'node:crypto';
import { AI_FEATURES, getAiConfig } from '../../config/aiConfig.js';
import { getGeminiClient } from './geminiClient.js';
import { executeAiRequest } from './aiExecutor.js';
import { AiError } from './geminiError.js';

export const PROMPT_VERSION = 'v1';

/**
 * Generates a SHA-256 content fingerprint from video title and description.
 *
 * @param {string} title
 * @param {string} [description='']
 * @returns {string} Hexadecimal hash
 */
export function createContentFingerprint(title, description = '') {
  const normTitle = (title || '').trim();
  const normDesc = (description || '').trim();
  return crypto
    .createHash('sha256')
    .update(`${normTitle}\n${normDesc}`)
    .digest('hex');
}

/**
 * Builds the strict anti-hallucination prompt for Gemini 3.8 Flash.
 *
 * @param {string} title
 * @param {string} description
 * @returns {string} Prompt string
 */
export function buildNotesPrompt(title, description) {
  return `You are an expert computing, software engineering, and data science educator for SkillVault.

Generate detailed, high-quality structured learning notes grounded in the provided video title and description below.
Synthesize the technical topics thoroughly:
- Provide an educational, thorough summary explaining the lesson's core technical focus and scope.
- Extract every distinct concept or topic mentioned in the description, providing an in-depth, clear explanation of what it is, its purpose, and how it works based on the context.
- Identify key technical terms, tools, or commands referenced and provide precise definitions.
- Provide actionable, high-value takeaways that learners should remember.
- Anti-hallucination rule: Do not invent completely unrelated libraries, commands, or details that contradict or have no foundation in the provided title and description.

Video Title:
${(title || '').trim()}

Video Description:
${(description || '').trim() || 'No additional description provided.'}

Your response must be a single, valid JSON object with exactly the following structure:
{
  "summary": "A comprehensive, multi-sentence overview explaining the primary computing concepts, practical workflows, and objectives taught in this lesson based on the title and description.",
  "keyConcepts": [
    {
      "concept": "Concept or Topic Name",
      "explanation": "A thorough, educational explanation describing what this concept is, why it matters, and how it is applied in the context of this lesson."
    }
  ],
  "definitions": [
    {
      "term": "Technical Term / Command",
      "definition": "Precise, clear definition or role of this term as covered in the lesson."
    }
  ],
  "takeaways": [
    "Comprehensive, actionable takeaway point 1",
    "Comprehensive, actionable takeaway point 2"
  ]
}

Ensure all JSON strings are properly escaped. Do not wrap the JSON in Markdown code blocks or include extra commentary.`;
}

/**
 * Parses and validates raw text output into structured notes data.
 *
 * @param {string} rawText
 * @returns {object} Validated notes object
 */
export function parseNotesResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw AiError.invalidOutput('AI service returned an empty response.');
  }

  // Strip Markdown code fences if returned (e.g. ```json ... ```)
  let cleanText = rawText.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (err) {
    throw AiError.invalidOutput(`Failed to parse AI response as JSON: ${err.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw AiError.invalidOutput('Malformed AI output: expected a JSON object.');
  }

  // Validate summary
  if (!parsed.summary || typeof parsed.summary !== 'string') {
    throw AiError.invalidOutput('Malformed AI output: missing "summary" string.');
  }

  // Validate and clean keyConcepts
  const keyConcepts = Array.isArray(parsed.keyConcepts)
    ? parsed.keyConcepts
        .filter((c) => c && typeof c === 'object' && typeof c.concept === 'string')
        .map((c) => ({
          concept: c.concept.trim(),
          explanation: typeof c.explanation === 'string' ? c.explanation.trim() : ''
        }))
    : [];

  // Validate and clean definitions
  const definitions = Array.isArray(parsed.definitions)
    ? parsed.definitions
        .filter((d) => d && typeof d === 'object' && typeof d.term === 'string')
        .map((d) => ({
          term: d.term.trim(),
          definition: typeof d.definition === 'string' ? d.definition.trim() : ''
        }))
    : [];

  // Validate and clean takeaways
  const takeaways = Array.isArray(parsed.takeaways)
    ? parsed.takeaways
        .filter((t) => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim())
    : [];

  return {
    summary: parsed.summary.trim(),
    keyConcepts,
    definitions,
    takeaways
  };
}

/**
 * Generates structured notes for a video using the shared AI infrastructure.
 *
 * @param {object} params
 * @param {string} params.title - Video title
 * @param {string} [params.description] - Video description
 * @param {string|mongoose.Types.ObjectId} params.userId - Requesting user ID
 * @returns {Promise<object>} Parsed notes payload
 */
export async function generateNotesForVideo({ title, description, userId }) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw AiError.invalidInput('Video title is required to generate notes.');
  }

  const prompt = buildNotesPrompt(title, description);
  const featConfig = getAiConfig(AI_FEATURES.NOTES);

  const rawResult = await executeAiRequest({
    feature: AI_FEATURES.NOTES,
    userId,
    maxRetries: 1,
    retryDelayMs: 300,
    operation: async ({ model }) => {
      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: model || featConfig.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      });

      // Handle both official SDK response objects and mock objects
      const text =
        typeof response?.text === 'function'
          ? response.text()
          : response?.text ||
            response?.candidates?.[0]?.content?.parts?.[0]?.text;

      return text;
    }
  });

  return parseNotesResponse(rawResult);
}

export default {
  PROMPT_VERSION,
  createContentFingerprint,
  buildNotesPrompt,
  parseNotesResponse,
  generateNotesForVideo
};
