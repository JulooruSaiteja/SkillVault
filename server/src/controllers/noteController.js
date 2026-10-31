import mongoose from 'mongoose';
import { Video } from '../models/Video.js';
import { Note } from '../models/Note.js';
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
  generateNotesForVideo,
  createContentFingerprint,
  PROMPT_VERSION
} from '../services/ai/notesService.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

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
 * GET /api/videos/:identifier/notes
 * Retrieves cached notes for a video if available, along with real-time quota status.
 */
export async function getVideoNotes(req, res, next) {
  try {
    const video = await resolveActiveVideo(req.params.identifier);

    // 1. Look up cached notes for this video
    const note = await Note.findOne({
      video: video._id,
      promptVersion: PROMPT_VERSION
    }).lean();

    // 2. Fetch global quota status
    const globalStatus = await getGlobalBudgetStatus(AI_FEATURES.NOTES);

    // 3. Fetch user quota status if authenticated
    let userQuota = null;
    if (req.user) {
      userQuota = await checkUserAllowance(req.user._id, AI_FEATURES.NOTES);
    }

    const canGenerate = Boolean(
      !note &&
      req.user &&
      userQuota?.allowed &&
      !globalStatus.isExhausted
    );

    return ApiResponse.ok(
      res,
      note ? 'Cached notes retrieved' : 'No notes generated yet for this lesson',
      {
        notes: note || null,
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
 * POST /api/videos/:identifier/notes
 * Generates and caches learning notes using Gemini 3.8 Flash grounded strictly on video title & description.
 */
export async function generateVideoNotes(req, res, next) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required to generate notes');
    }

    const video = await resolveActiveVideo(req.params.identifier);

    // 1. Check if notes are already cached in MongoDB
    const existingNote = await Note.findOne({
      video: video._id,
      promptVersion: PROMPT_VERSION
    });

    if (existingNote) {
      return ApiResponse.ok(
        res,
        'Notes retrieved from cache',
        {
          notes: existingNote,
          cached: true
        }
      );
    }

    // 2. Pre-check user allowance (1 per user per UTC day)
    const userAllowance = await checkUserAllowance(req.user._id, AI_FEATURES.NOTES);
    if (!userAllowance.allowed) {
      const featConfig = getAiConfig(AI_FEATURES.NOTES);
      throw ApiError.tooManyRequests(
        `You have reached your daily limit of ${featConfig.userDailyLimit} notes generation. Your allowance resets at 00:00 UTC.`
      );
    }

    // 3. Generate notes via Gemini 3.8 Flash (enforces global budget reservation and retry accounting)
    const generatedData = await generateNotesForVideo({
      title: video.title,
      description: video.description,
      userId: req.user._id
    });

    // 4. Persist to MongoDB cache
    const featConfig = getAiConfig(AI_FEATURES.NOTES);
    const contentFingerprint = createContentFingerprint(video.title, video.description);

    let createdNote;
    try {
      createdNote = await Note.create({
        video: video._id,
        summary: generatedData.summary,
        keyConcepts: generatedData.keyConcepts,
        definitions: generatedData.definitions,
        takeaways: generatedData.takeaways,
        contentFingerprint,
        promptVersion: PROMPT_VERSION,
        model: featConfig.model,
        generatedBy: req.user._id,
        source: 'title_description'
      });
    } catch (saveErr) {
      // Handle race condition where another request created note concurrently
      if (saveErr.code === 11000) {
        const found = await Note.findOne({ video: video._id, promptVersion: PROMPT_VERSION });
        return ApiResponse.ok(res, 'Notes loaded from cache', { notes: found, cached: true });
      }
      throw saveErr;
    }

    // 5. Record successful generation for user's daily allowance
    await recordUserSuccess(req.user._id, AI_FEATURES.NOTES);

    return ApiResponse.created(
      res,
      'Notes generated successfully',
      {
        notes: createdNote,
        cached: false
      }
    );
  } catch (err) {
    return next(err);
  }
}

export default {
  getVideoNotes,
  generateVideoNotes
};
