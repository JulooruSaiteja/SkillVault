import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { Quiz, sanitizeQuizForLearner } from '../models/Quiz.js';
import {
  AI_FEATURES,
  getAiConfig
} from '../config/aiConfig.js';
import {
  getGlobalBudgetStatus,
  checkUserAllowance,
  recordUserSuccess
} from '../services/ai/budgetService.js';
import {
  generateQuizForVideo,
  createContentFingerprint,
  QUIZ_PROMPT_VERSION
} from '../services/ai/quizService.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { AiError } from '../services/ai/geminiError.js';

/**
 * Resolves an active video by either MongoDB ObjectId or URL slug.
 *
 * @param {string} identifier
 * @returns {Promise<Document>}
 */
async function resolveActiveVideo(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    throw ApiError.badRequest('Invalid video identifier');
  }

  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
  const filter = isObjectId
    ? { _id: identifier, isActive: true }
    : { slug: identifier.trim().toLowerCase(), isActive: true };

  const video = await Video.findOne(filter);
  if (!video) {
    throw ApiError.notFound('Video lesson not found');
  }

  return video;
}

/**
 * GET /api/videos/:identifier/quiz
 * Retrieves the cached quiz for a video (sanitized to hide answer keys), along with real-time quota status.
 */
export async function getVideoQuiz(req, res, next) {
  try {
    const video = await resolveActiveVideo(req.params.identifier);

    // 1. Look up cached quiz for this video
    const quizDoc = await Quiz.findOne({
      video: video._id,
      promptVersion: QUIZ_PROMPT_VERSION
    }).lean();

    // 2. Fetch global quota status
    const globalStatus = await getGlobalBudgetStatus(AI_FEATURES.QUIZ);

    // 3. Fetch user quota status if authenticated
    let userQuota = null;
    if (req.user) {
      userQuota = await checkUserAllowance(req.user._id, AI_FEATURES.QUIZ);
    }

    const canGenerate = Boolean(
      !quizDoc &&
      req.user &&
      userQuota?.allowed &&
      !globalStatus.isExhausted
    );

    return ApiResponse.ok(
      res,
      quizDoc ? 'Cached quiz retrieved' : 'No quiz generated yet for this lesson',
      {
        quiz: quizDoc ? sanitizeQuizForLearner(quizDoc) : null,
        canGenerate,
        userQuota,
        globalQuota: {
          isExhausted: globalStatus.isExhausted,
          remaining: globalStatus.remaining,
          dailyBudget: globalStatus.dailyBudget,
          resetsAt: globalStatus.resetsAt
        }
      }
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/videos/:identifier/quiz
 * Generates and caches a 5-MCQ quiz using Gemini 3.1 Flash Lite grounded strictly on video title & description.
 */
export async function generateVideoQuiz(req, res, next) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required to generate practice quiz');
    }

    const video = await resolveActiveVideo(req.params.identifier);

    // 1. Check if quiz is already cached in MongoDB
    const existingQuiz = await Quiz.findOne({
      video: video._id,
      promptVersion: QUIZ_PROMPT_VERSION
    });

    if (existingQuiz) {
      return ApiResponse.ok(
        res,
        'Quiz retrieved from cache',
        {
          quiz: sanitizeQuizForLearner(existingQuiz),
          cached: true
        }
      );
    }

    // 2. Pre-check user allowance (2 per user per UTC day)
    const userAllowance = await checkUserAllowance(req.user._id, AI_FEATURES.QUIZ);
    if (!userAllowance.allowed) {
      const featConfig = getAiConfig(AI_FEATURES.QUIZ);
      throw AiError.userQuotaExhausted(AI_FEATURES.QUIZ, featConfig.userDailyLimit);
    }

    // 3. Generate quiz via Gemini 3.1 Flash Lite (enforces global budget reservation and retry accounting)
    const generatedData = await generateQuizForVideo({
      title: video.title,
      description: video.description,
      userId: req.user._id
    });

    if (!generatedData || !Array.isArray(generatedData.questions) || generatedData.questions.length === 0) {
      throw AiError.invalidOutput('Generated quiz structure is invalid. Please try again.', AI_FEATURES.QUIZ);
    }

    // 4. Persist to MongoDB cache
    const featConfig = getAiConfig(AI_FEATURES.QUIZ);
    const contentFingerprint = createContentFingerprint(video.title, video.description);

    let createdQuiz;
    try {
      createdQuiz = await Quiz.create({
        video: video._id,
        questions: generatedData.questions,
        contentFingerprint,
        promptVersion: QUIZ_PROMPT_VERSION,
        model: featConfig.model,
        generatedBy: req.user._id,
        source: 'title_description'
      });
    } catch (saveErr) {
      // Handle race condition where another request created quiz concurrently
      if (saveErr.code === 11000) {
        const found = await Quiz.findOne({ video: video._id, promptVersion: QUIZ_PROMPT_VERSION });
        return ApiResponse.ok(res, 'Quiz loaded from cache', {
          quiz: sanitizeQuizForLearner(found),
          cached: true
        });
      }
      throw saveErr;
    }

    // 5. Record successful generation for user quota accounting
    await recordUserSuccess(req.user._id, AI_FEATURES.QUIZ);

    return ApiResponse.created(
      res,
      'Practice quiz generated successfully',
      {
        quiz: sanitizeQuizForLearner(createdQuiz),
        cached: false
      }
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/videos/:identifier/quiz/submit
 * Evaluates learner answers securely on the backend, calculates final score out of five (X/5 marks),
 * and reveals correct options and explanations.
 */
export async function submitVideoQuiz(req, res, next) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required to submit quiz');
    }

    const video = await resolveActiveVideo(req.params.identifier);

    // 1. Retrieve the quiz for this video
    const quizDoc = await Quiz.findOne({
      video: video._id,
      promptVersion: QUIZ_PROMPT_VERSION
    });

    if (!quizDoc) {
      throw ApiError.notFound('No quiz exists for this lesson. Please generate a quiz first.');
    }

    const answersInput = req.body?.answers;
    if (!answersInput) {
      throw ApiError.badRequest('Answers must be provided in request body');
    }

    // Standardize answers map: questionIndex -> selectedOptionIndex (0..3)
    const answersMap = new Map();

    if (Array.isArray(answersInput)) {
      answersInput.forEach((item, idx) => {
        if (typeof item === 'number') {
          answersMap.set(idx, item);
        } else if (item && typeof item === 'object' && typeof item.questionIndex === 'number') {
          answersMap.set(item.questionIndex, item.selectedOption);
        }
      });
    } else if (typeof answersInput === 'object') {
      Object.entries(answersInput).forEach(([key, val]) => {
        const qIdx = parseInt(key, 10);
        if (!isNaN(qIdx)) {
          answersMap.set(qIdx, val);
        }
      });
    }

    // 2. Evaluate answers against stored questions
    let correctCount = 0;
    const totalQuestions = quizDoc.questions.length;

    const results = quizDoc.questions.map((q, idx) => {
      const selected = answersMap.has(idx) ? answersMap.get(idx) : null;
      const isCorrect = selected !== null && selected !== undefined && Number(selected) === q.correctOptionIndex;

      if (isCorrect) {
        correctCount++;
      }

      return {
        questionIndex: idx,
        questionText: q.questionText,
        options: q.options,
        selectedOption: selected !== null && selected !== undefined ? Number(selected) : null,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        explanation: q.explanation
      };
    });

    const scoreDisplay = `${correctCount}/${totalQuestions} marks`;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    // Persist quiz score and display string on learner profile for Phase 15 dashboard stats
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        quizScores: {
          video: video._id,
          videoTitle: video.title,
          score: correctCount,
          totalQuestions,
          scoreDisplay,
          createdAt: new Date()
        }
      }
    });

    return ApiResponse.ok(
      res,
      'Quiz evaluated successfully',
      {
        score: correctCount,
        totalQuestions,
        scoreDisplay,
        percentage,
        results
      }
    );
  } catch (err) {
    return next(err);
  }
}

export default {
  getVideoQuiz,
  generateVideoQuiz,
  submitVideoQuiz
};
