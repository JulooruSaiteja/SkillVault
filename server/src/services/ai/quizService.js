import crypto from 'node:crypto';
import { AI_FEATURES, getAiConfig } from '../../config/aiConfig.js';
import { getGeminiClient } from './geminiClient.js';
import { executeAiRequest } from './aiExecutor.js';
import { AiError } from './geminiError.js';

export const QUIZ_PROMPT_VERSION = 'v1';

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
 * Builds the strict anti-hallucination prompt for Gemini 3.1 Flash Lite.
 *
 * @param {string} title
 * @param {string} description
 * @returns {string} Prompt string
 */
export function buildQuizPrompt(title, description) {
  return `You are an expert computing, software engineering, and data science educator for SkillVault.

Generate a conceptual practice quiz strictly grounded in the video title and description provided below.
Rules:
1. You must generate exactly five (5) multiple-choice questions (MCQs).
2. Each question must have exactly four (4) distinct, plausible options.
3. Each question must have exactly one correct option, designated by a zero-based integer index (0, 1, 2, or 3) indicating its position in the options array.
4. Each question must include a clear, educational explanation explaining why the designated option is correct.
5. Grounding rule: Questions must test understanding of the concepts, tools, or techniques referenced in the title and description. Do not test topics completely unrelated to this lesson.
6. Do not include difficulty labels (Easy, Medium, Hard) or question count variations.

Video Title:
${(title || '').trim()}

Video Description:
${(description || '').trim() || 'No additional description provided.'}

Your response must be a single, valid JSON object with exactly the following structure:
{
  "questions": [
    {
      "questionText": "Clear, technically precise question testing core concepts...",
      "options": [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      "correctOptionIndex": 0,
      "explanation": "Clear explanation of why this answer is correct based on the lesson."
    }
  ]
}

Ensure all JSON strings are properly escaped. Do not wrap the JSON in Markdown code blocks or include extra commentary.`;
}

/**
 * Parses and validates raw text output into structured 5-MCQ quiz data.
 *
 * @param {string} rawText
 * @returns {{ questions: Array<{ questionText: string, options: string[], correctOptionIndex: number, explanation: string }> }}
 */
export function parseQuizResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw AiError.invalidOutput('AI service returned an empty quiz response.');
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
    throw AiError.invalidOutput(`Failed to parse AI quiz response as JSON: ${err.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw AiError.invalidOutput('Malformed AI output: expected a JSON object.');
  }

  if (!Array.isArray(parsed.questions)) {
    throw AiError.invalidOutput('Malformed AI output: missing "questions" array.');
  }

  if (parsed.questions.length !== 5) {
    throw AiError.invalidOutput(
      `Malformed AI output: quiz must contain exactly 5 questions, received ${parsed.questions.length}.`
    );
  }

  const validatedQuestions = parsed.questions.map((q, idx) => {
    if (!q || typeof q !== 'object') {
      throw AiError.invalidOutput(`Malformed AI output: question at index ${idx} is not an object.`);
    }

    if (!q.questionText || typeof q.questionText !== 'string' || q.questionText.trim().length === 0) {
      throw AiError.invalidOutput(`Malformed AI output: question at index ${idx} has missing or empty questionText.`);
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw AiError.invalidOutput(
        `Malformed AI output: question at index ${idx} must have exactly 4 options, received ${q.options?.length || 0}.`
      );
    }

    const cleanedOptions = q.options.map((opt, optIdx) => {
      if (typeof opt !== 'string' || opt.trim().length === 0) {
        throw AiError.invalidOutput(
          `Malformed AI output: option ${optIdx} for question ${idx} must be a non-empty string.`
        );
      }
      return opt.trim();
    });

    const correctIdx = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : parseInt(q.correctOptionIndex, 10);
    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx > 3) {
      throw AiError.invalidOutput(
        `Malformed AI output: question at index ${idx} has invalid correctOptionIndex (${q.correctOptionIndex}). Must be 0, 1, 2, or 3.`
      );
    }

    if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length === 0) {
      throw AiError.invalidOutput(`Malformed AI output: question at index ${idx} is missing an explanation.`);
    }

    return {
      questionText: q.questionText.trim(),
      options: cleanedOptions,
      correctOptionIndex: correctIdx,
      explanation: q.explanation.trim()
    };
  });

  return { questions: validatedQuestions };
}

/**
 * Generates structured 5-MCQ quiz data for a video using Gemini 3.1 Flash Lite.
 * Integrates directly with the shared AI Executor and Budget Service.
 *
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string|mongoose.Types.ObjectId} [params.userId]
 * @returns {Promise<{ questions: Array }>}
 */
export async function generateQuizForVideo({ title, description, userId = null }) {
  const featConfig = getAiConfig(AI_FEATURES.QUIZ);
  const prompt = buildQuizPrompt(title, description);

  return executeAiRequest({
    feature: AI_FEATURES.QUIZ,
    userId,
    maxRetries: 1,
    retryDelayMs: 300,
    operation: async () => {
      const client = getGeminiClient();

      const response = await client.models.generateContent({
        model: featConfig.model,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });

      const responseText = response?.text || (typeof response?.text === 'function' ? response.text() : '');
      return parseQuizResponse(responseText);
    }
  });
}

export default {
  QUIZ_PROMPT_VERSION,
  createContentFingerprint,
  buildQuizPrompt,
  parseQuizResponse,
  generateQuizForVideo
};
