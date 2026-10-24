import mongoose from 'mongoose';
import { Playlist } from '../models/Playlist.js';
import { Skill } from '../models/Skill.js';
import { Video } from '../models/Video.js';
import { VideoProgress } from '../models/VideoProgress.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * List active playlists.
 * Supports optional ?skill=slug_or_id filter.
 * Supports optionalAuth to enrich with user progress if logged in.
 */
export async function getPlaylists(req, res, next) {
  try {
    const { skill: skillParam } = req.query;
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
          return ApiResponse.ok(res, 'Playlists retrieved successfully', { playlists: [] });
        }
      }
    }

    const playlists = await Playlist.find(filter)
      .populate({
        path: 'skill',
        select: 'name slug icon category isActive',
        populate: {
          path: 'category',
          select: 'name slug icon'
        }
      })
      .sort({ order: 1, title: 1 })
      .lean();

    // Filter out playlists whose parent skill is inactive
    const activePlaylists = playlists.filter((pl) => !pl.skill || pl.skill.isActive !== false);

    // Enrich playlists with video counts and user progress
    const playlistIds = activePlaylists.map((p) => p._id);
    const videos = await Video.find({
      playlist: { $in: playlistIds },
      isActive: true
    }).select('_id playlist durationSeconds').lean();

    // Group videos by playlist
    const videosByPlaylist = {};
    for (const v of videos) {
      const pId = v.playlist.toString();
      if (!videosByPlaylist[pId]) {
        videosByPlaylist[pId] = [];
      }
      videosByPlaylist[pId].push(v);
    }

    // If user is authenticated, query completed videos
    let completedVideoIdSet = new Set();
    if (req.user) {
      const allVideoIds = videos.map((v) => v._id);
      if (allVideoIds.length > 0) {
        const progressList = await VideoProgress.find({
          user: req.user._id,
          video: { $in: allVideoIds },
          isCompleted: true
        }).select('video').lean();

        completedVideoIdSet = new Set(progressList.map((p) => p.video.toString()));
      }
    }

    const enrichedPlaylists = activePlaylists.map((pl) => {
      const pVideos = videosByPlaylist[pl._id.toString()] || [];
      const totalVideos = pVideos.length;
      const totalDurationSeconds = pVideos.reduce((acc, cur) => acc + (cur.durationSeconds || 0), 0);

      let completedVideos = 0;
      if (req.user) {
        completedVideos = pVideos.filter((v) => completedVideoIdSet.has(v._id.toString())).length;
      }

      const progressPercentage = totalVideos > 0
        ? Math.round((completedVideos / totalVideos) * 100)
        : 0;

      return {
        ...pl,
        videosCount: totalVideos,
        totalDurationSeconds,
        progress: {
          totalVideos,
          completedVideos,
          progressPercentage,
          isCompleted: totalVideos > 0 && completedVideos === totalVideos
        }
      };
    });

    return ApiResponse.ok(res, 'Playlists retrieved successfully', {
      playlists: enrichedPlaylists
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get playlist details by ID or slug, including ordered constituent videos
 * and dynamic completion percentage.
 */
export async function getPlaylistById(req, res, next) {
  try {
    const { identifier } = req.params;

    let playlist = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      playlist = await Playlist.findOne({
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
        .lean();
    }

    if (!playlist) {
      playlist = await Playlist.findOne({
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
        .lean();
    }

    if (!playlist) {
      throw ApiError.notFound(`Playlist not found: ${identifier}`);
    }

    if (playlist.skill && playlist.skill.isActive === false) {
      throw ApiError.notFound(`Playlist belongs to a deactivated skill`);
    }

    // Retrieve active constituent videos in curriculum order
    const videos = await Video.find({
      playlist: playlist._id,
      isActive: true
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const totalVideos = videos.length;
    const totalDurationSeconds = videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0);

    // If learner is authenticated, check individual video completion & progress
    let completedVideosCount = 0;
    const videoProgressMap = {};

    if (req.user && totalVideos > 0) {
      const videoIds = videos.map((v) => v._id);
      const progressDocs = await VideoProgress.find({
        user: req.user._id,
        video: { $in: videoIds }
      }).lean();

      for (const p of progressDocs) {
        videoProgressMap[p.video.toString()] = p;
      }
    }

    const enrichedVideos = videos.map((video) => {
      const prog = videoProgressMap[video._id.toString()];
      const isCompleted = Boolean(prog && prog.isCompleted);
      const lastPositionSeconds = prog ? prog.lastPositionSeconds || 0 : 0;

      if (isCompleted) {
        completedVideosCount++;
      }

      return {
        ...video,
        isCompleted,
        lastPositionSeconds
      };
    });

    const progressPercentage = totalVideos > 0
      ? Math.round((completedVideosCount / totalVideos) * 100)
      : 0;

    return ApiResponse.ok(res, 'Playlist details retrieved successfully', {
      playlist,
      videos: enrichedVideos,
      stats: {
        totalVideos,
        completedVideos: completedVideosCount,
        progressPercentage,
        totalDurationSeconds,
        isCompleted: totalVideos > 0 && completedVideosCount === totalVideos
      }
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getPlaylists,
  getPlaylistById
};
