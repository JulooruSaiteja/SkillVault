import mongoose from 'mongoose';
import { Video } from '../models/Video.js';
import { Bookmark } from '../models/Bookmark.js';
import { VideoProgress } from '../models/VideoProgress.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Resolve video by MongoDB _id or URL slug.
 */
async function resolveVideo(identifier, allowInactive = false) {
  const query = allowInactive ? {} : { isActive: true };

  let video = null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    video = await Video.findOne({ _id: identifier, ...query });
  }
  if (!video) {
    video = await Video.findOne({ slug: identifier.toLowerCase(), ...query });
  }
  return video;
}

/**
 * Add a video to personal bookmarks.
 * Enforces unique (user, video) constraint.
 */
export async function addBookmark(req, res, next) {
  try {
    const videoIdentifier = req.params.identifier || req.body.videoId;
    if (!videoIdentifier) {
      throw ApiError.badRequest('Video identifier (videoId or route param) is required');
    }

    const video = await resolveVideo(videoIdentifier, false);
    if (!video) {
      throw ApiError.notFound(`Active video not found: ${videoIdentifier}`);
    }

    // Check if already bookmarked (idempotent addition)
    let bookmark = await Bookmark.findOne({
      user: req.user._id,
      video: video._id
    });

    let statusCode = 200;
    if (!bookmark) {
      bookmark = await Bookmark.create({
        user: req.user._id,
        video: video._id
      });
      statusCode = 201;
    }

    return res.status(statusCode).json({
      success: true,
      message: 'Video bookmarked successfully',
      data: {
        bookmark,
        isBookmarked: true
      }
    });
  } catch (err) {
    // Handle duplicate key error gracefully if race condition occurs
    if (err.code === 11000) {
      const existing = await Bookmark.findOne({
        user: req.user._id,
        video: req.body.videoId
      });
      return ApiResponse.ok(res, 'Video already bookmarked', {
        bookmark: existing,
        isBookmarked: true
      });
    }
    next(err);
  }
}

/**
 * Remove a video from personal bookmarks.
 * Allows removal even if video has been soft-deactivated.
 */
export async function removeBookmark(req, res, next) {
  try {
    const videoIdentifier = req.params.identifier || req.params.videoId || req.body.videoId;
    if (!videoIdentifier) {
      throw ApiError.badRequest('Video identifier is required');
    }

    const video = await resolveVideo(videoIdentifier, true);
    let deleted = null;

    if (video) {
      deleted = await Bookmark.findOneAndDelete({
        user: req.user._id,
        video: video._id
      });
    } else if (mongoose.Types.ObjectId.isValid(videoIdentifier)) {
      // Direct deletion by bookmark _id or video ObjectId
      deleted = await Bookmark.findOneAndDelete({
        user: req.user._id,
        $or: [{ video: videoIdentifier }, { _id: videoIdentifier }]
      });
    }

    return ApiResponse.ok(res, 'Bookmark removed successfully', {
      isBookmarked: false,
      removed: Boolean(deleted)
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all bookmarks for the authenticated learner.
 * Returns bookmarks ordered by newest first.
 * Soft-deactivated videos are preserved with isArchived: true.
 */
export async function getBookmarks(req, res, next) {
  try {
    const bookmarkDocs = await Bookmark.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'video',
        select: 'title slug durationSeconds youtubeVideoId order isActive hasTranscript skill playlist',
        populate: [
          { path: 'skill', select: 'name slug icon isActive' },
          { path: 'playlist', select: 'title slug isActive' }
        ]
      })
      .lean();

    // Collect active video IDs to fetch user progress
    const videoIds = bookmarkDocs
      .filter((doc) => doc.video)
      .map((doc) => doc.video._id);

    const progressDocs = await VideoProgress.find({
      user: req.user._id,
      video: { $in: videoIds }
    }).lean();

    const progressMap = {};
    for (const prog of progressDocs) {
      progressMap[prog.video.toString()] = prog;
    }

    const bookmarks = [];
    for (const doc of bookmarkDocs) {
      if (!doc.video) {
        // Video document was hard deleted from database
        continue;
      }

      const isArchived = doc.video.isActive === false || (doc.video.skill && doc.video.skill.isActive === false);
      const prog = progressMap[doc.video._id.toString()];

      bookmarks.push({
        _id: doc._id,
        createdAt: doc.createdAt,
        isArchived,
        video: {
          _id: doc.video._id,
          title: doc.video.title,
          slug: doc.video.slug,
          durationSeconds: doc.video.durationSeconds,
          youtubeVideoId: doc.video.youtubeVideoId,
          order: doc.video.order,
          isActive: doc.video.isActive !== false,
          hasTranscript: Boolean(doc.video.hasTranscript),
          skill: doc.video.skill,
          playlist: doc.video.playlist,
          userProgress: prog
            ? {
                lastPositionSeconds: prog.lastPositionSeconds || 0,
                isCompleted: Boolean(prog.isCompleted),
                progressPercentage:
                  prog.durationSeconds > 0
                    ? Math.min(100, Math.round((prog.lastPositionSeconds / prog.durationSeconds) * 100))
                    : 0
              }
            : null
        }
      });
    }

    return ApiResponse.ok(res, 'Bookmarks retrieved successfully', {
      bookmarks,
      totalCount: bookmarks.length
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Check if a specific video is bookmarked by the authenticated learner.
 */
export async function checkBookmark(req, res, next) {
  try {
    const videoIdentifier = req.params.identifier || req.params.videoId;
    if (!videoIdentifier) {
      throw ApiError.badRequest('Video identifier is required');
    }

    const video = await resolveVideo(videoIdentifier, true);
    if (!video) {
      return ApiResponse.ok(res, 'Bookmark status retrieved', {
        isBookmarked: false,
        bookmarkId: null
      });
    }

    const bookmark = await Bookmark.findOne({
      user: req.user._id,
      video: video._id
    }).lean();

    return ApiResponse.ok(res, 'Bookmark status retrieved', {
      isBookmarked: Boolean(bookmark),
      bookmarkId: bookmark ? bookmark._id : null
    });
  } catch (err) {
    next(err);
  }
}

export default {
  addBookmark,
  removeBookmark,
  getBookmarks,
  checkBookmark
};
