import mongoose from 'mongoose';
import { Video } from '../models/Video.js';
import { VideoProgress } from '../models/VideoProgress.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Helper to resolve video by ObjectId or slug.
 */
async function findActiveVideo(identifier) {
  let video = null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    video = await Video.findOne({ _id: identifier, isActive: true });
  }
  if (!video) {
    video = await Video.findOne({ slug: identifier.toLowerCase(), isActive: true });
  }
  return video;
}

/**
 * Format progress object for API response
 */
function formatProgressResponse(progressDoc, videoDoc = null) {
  const duration = progressDoc.durationSeconds || (videoDoc ? videoDoc.durationSeconds : 0) || 0;
  const position = progressDoc.lastPositionSeconds || 0;
  const percentage = duration > 0 ? Math.min(100, Math.round((position / duration) * 100)) : 0;

  return {
    _id: progressDoc._id,
    user: progressDoc.user,
    video: progressDoc.video,
    lastPositionSeconds: position,
    durationSeconds: duration,
    isCompleted: Boolean(progressDoc.isCompleted),
    progressPercentage: percentage,
    updatedAt: progressDoc.updatedAt || new Date()
  };
}

/**
 * Save or update playback progress for a video.
 * Enforces 90% duration threshold to mark isCompleted: true.
 * Once marked completed, rewinds will not revert isCompleted to false.
 */
export async function saveProgress(req, res, next) {
  try {
    const videoIdentifier = req.params.identifier || req.body.videoId;
    if (!videoIdentifier) {
      throw ApiError.badRequest('Video identifier (videoId or route param) is required');
    }

    const video = await findActiveVideo(videoIdentifier);
    if (!video) {
      throw ApiError.notFound(`Active video not found: ${videoIdentifier}`);
    }

    let { lastPositionSeconds, durationSeconds } = req.body;

    if (lastPositionSeconds === undefined || lastPositionSeconds === null) {
      throw ApiError.badRequest('lastPositionSeconds is required');
    }

    const pos = Number(lastPositionSeconds);
    if (isNaN(pos) || pos < 0) {
      throw ApiError.badRequest('lastPositionSeconds must be a non-negative number');
    }

    const dur = durationSeconds !== undefined && durationSeconds !== null
      ? Number(durationSeconds)
      : (video.durationSeconds || 0);

    if (isNaN(dur) || dur < 0) {
      throw ApiError.badRequest('durationSeconds must be a non-negative number');
    }

    // Find existing progress record
    let progress = await VideoProgress.findOne({
      user: req.user._id,
      video: video._id
    });

    const isNinetyPercent = dur > 0 && pos >= 0.9 * dur;

    if (!progress) {
      progress = new VideoProgress({
        user: req.user._id,
        video: video._id,
        lastPositionSeconds: Math.round(pos * 100) / 100,
        durationSeconds: Math.round(dur * 100) / 100,
        isCompleted: isNinetyPercent
      });
      await progress.save();
    } else {
      progress.lastPositionSeconds = Math.round(pos * 100) / 100;
      if (dur > 0) {
        progress.durationSeconds = Math.round(dur * 100) / 100;
      }
      // Set completed if 90% reached or keep previously earned completion
      if (isNinetyPercent || progress.isCompleted) {
        progress.isCompleted = true;
      }
      await progress.save();
    }

    const formatted = formatProgressResponse(progress, video);
    return ApiResponse.ok(res, 'Progress saved successfully', { progress: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve progress for a specific video for the authenticated user.
 * Returns default 0-progress if no record exists yet.
 */
export async function getProgress(req, res, next) {
  try {
    const videoIdentifier = req.params.identifier || req.params.videoId;
    if (!videoIdentifier) {
      throw ApiError.badRequest('Video identifier is required');
    }

    const video = await findActiveVideo(videoIdentifier);
    if (!video) {
      throw ApiError.notFound(`Active video not found: ${videoIdentifier}`);
    }

    const progress = await VideoProgress.findOne({
      user: req.user._id,
      video: video._id
    });

    if (!progress) {
      return ApiResponse.ok(res, 'Progress retrieved successfully', {
        progress: {
          user: req.user._id,
          video: video._id,
          lastPositionSeconds: 0,
          durationSeconds: video.durationSeconds || 0,
          isCompleted: false,
          progressPercentage: 0,
          updatedAt: null
        }
      });
    }

    const formatted = formatProgressResponse(progress, video);
    return ApiResponse.ok(res, 'Progress retrieved successfully', { progress: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * Get recent / continue-learning videos for the authenticated learner.
 * Returns progress records sorted by latest updatedAt descending.
 * Populates video, skill, and playlist metadata.
 */
export async function getRecentProgress(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const progressDocs = await VideoProgress.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .populate({
        path: 'video',
        select: 'title slug durationSeconds youtubeVideoId order isActive skill playlist hasTranscript',
        populate: [
          { path: 'skill', select: 'name slug icon isActive' },
          { path: 'playlist', select: 'title slug isActive' }
        ]
      })
      .lean();

    // Filter out records where video was hard deleted or video is inactive,
    // but preserve records with inactive skill/playlist with appropriate flags
    const recent = [];
    for (const doc of progressDocs) {
      if (!doc.video) continue;

      // Check if video is active
      const isVideoActive = doc.video.isActive !== false;
      const duration = doc.durationSeconds || doc.video.durationSeconds || 0;
      const position = doc.lastPositionSeconds || 0;
      const percentage = duration > 0 ? Math.min(100, Math.round((position / duration) * 100)) : 0;

      recent.push({
        _id: doc._id,
        lastPositionSeconds: position,
        durationSeconds: duration,
        isCompleted: Boolean(doc.isCompleted),
        progressPercentage: percentage,
        updatedAt: doc.updatedAt,
        video: {
          _id: doc.video._id,
          title: doc.video.title,
          slug: doc.video.slug,
          durationSeconds: doc.video.durationSeconds,
          youtubeVideoId: doc.video.youtubeVideoId,
          order: doc.video.order,
          isActive: isVideoActive,
          hasTranscript: Boolean(doc.video.hasTranscript),
          skill: doc.video.skill,
          playlist: doc.video.playlist
        }
      });

      if (recent.length >= limit) {
        break;
      }
    }

    return ApiResponse.ok(res, 'Recent progress retrieved successfully', {
      recent,
      totalCount: recent.length
    });
  } catch (err) {
    next(err);
  }
}

export default {
  saveProgress,
  getProgress,
  getRecentProgress
};
