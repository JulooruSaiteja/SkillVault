import mongoose from 'mongoose';
import { Video } from '../models/Video.js';
import { Skill } from '../models/Skill.js';
import { Playlist } from '../models/Playlist.js';
import { VideoProgress } from '../models/VideoProgress.js';
import { Bookmark } from '../models/Bookmark.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * List active videos.
 * Supports optional ?skill=slug_or_id and ?playlist=slug_or_id filters.
 */
export async function getVideos(req, res, next) {
  try {
    const { skill: skillParam, playlist: playlistParam } = req.query;
    const filter = { isActive: true };

    if (skillParam) {
      if (mongoose.Types.ObjectId.isValid(skillParam)) {
        filter.skill = skillParam;
      } else {
        const skillDoc = await Skill.findOne({
          slug: skillParam.toLowerCase(),
          isActive: true
        });
        if (skillDoc) {
          filter.skill = skillDoc._id;
        } else {
          return ApiResponse.ok(res, 'Videos retrieved successfully', { videos: [] });
        }
      }
    }

    if (playlistParam) {
      if (mongoose.Types.ObjectId.isValid(playlistParam)) {
        filter.playlist = playlistParam;
      } else {
        const playlistDoc = await Playlist.findOne({
          slug: playlistParam.toLowerCase(),
          isActive: true
        });
        if (playlistDoc) {
          filter.playlist = playlistDoc._id;
        } else {
          return ApiResponse.ok(res, 'Videos retrieved successfully', { videos: [] });
        }
      }
    }

    const videos = await Video.find(filter)
      .populate('skill', 'name slug icon')
      .populate('playlist', 'title slug')
      .sort({ order: 1, title: 1 })
      .lean();

    return ApiResponse.ok(res, 'Videos retrieved successfully', { videos });
  } catch (err) {
    next(err);
  }
}

/**
 * Get video details by ID or slug, including skill, category, playlist context,
 * and sibling videos for curriculum navigation.
 */
export async function getVideoById(req, res, next) {
  try {
    const { identifier } = req.params;

    let video = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      video = await Video.findOne({
        _id: identifier,
        isActive: true
      })
        .populate({
          path: 'skill',
          select: 'name slug icon category description isActive',
          populate: {
            path: 'category',
            select: 'name slug icon'
          }
        })
        .populate('playlist', 'title slug description externalYoutubePlaylistId isActive')
        .lean();
    }

    if (!video) {
      video = await Video.findOne({
        slug: identifier.toLowerCase(),
        isActive: true
      })
        .populate({
          path: 'skill',
          select: 'name slug icon category description isActive',
          populate: {
            path: 'category',
            select: 'name slug icon'
          }
        })
        .populate('playlist', 'title slug description externalYoutubePlaylistId isActive')
        .lean();
    }

    if (!video) {
      throw ApiError.notFound(`Video not found: ${identifier}`);
    }

    if (video.skill && video.skill.isActive === false) {
      throw ApiError.notFound('Video belongs to a deactivated skill');
    }

    if (video.playlist && video.playlist.isActive === false) {
      video.playlist = null;
    }

    // Playlist curriculum context if video is part of a playlist
    let playlistContext = null;
    if (video.playlist) {
      const playlistVideos = await Video.find({
        playlist: video.playlist._id,
        isActive: true
      })
        .sort({ order: 1, createdAt: 1 })
        .select('_id title slug durationSeconds order hasTranscript')
        .lean();

      const currentIndex = playlistVideos.findIndex((v) => v._id.toString() === video._id.toString());
      const previousVideo = currentIndex > 0 ? playlistVideos[currentIndex - 1] : null;
      const nextVideo = currentIndex >= 0 && currentIndex < playlistVideos.length - 1 ? playlistVideos[currentIndex + 1] : null;

      playlistContext = {
        playlist: video.playlist,
        videos: playlistVideos,
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
        totalVideos: playlistVideos.length,
        previousVideo,
        nextVideo
      };
    }

    // Attach user progress and bookmark status if user is authenticated (via optionalAuth)
    let userProgress = null;
    let isBookmarked = false;
    if (req.user) {
      const [progressDoc, bookmarkDoc] = await Promise.all([
        VideoProgress.findOne({
          user: req.user._id,
          video: video._id
        }).lean(),
        Bookmark.findOne({
          user: req.user._id,
          video: video._id
        }).lean()
      ]);

      if (progressDoc) {
        userProgress = {
          lastPositionSeconds: progressDoc.lastPositionSeconds || 0,
          isCompleted: Boolean(progressDoc.isCompleted),
          updatedAt: progressDoc.updatedAt
        };
      }
      isBookmarked = Boolean(bookmarkDoc);
    }

    return ApiResponse.ok(res, 'Video details retrieved successfully', {
      video: {
        ...video,
        userProgress,
        isBookmarked
      },
      playlistContext
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getVideos,
  getVideoById
};
