import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { Playlist } from '../models/Playlist.js';
import { VideoProgress } from '../models/VideoProgress.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * GET /api/dashboard
 * Retrieves consolidated learner progress, continue-learning resume pointer,
 * playlist completion milestones, and basic quiz statistics (X/5 marks).
 */
export async function getDashboardOverview(req, res, next) {
  try {
    const userId = req.user._id;

    // 1. Fetch all progress records for this user, sorted newest first
    const progressDocs = await VideoProgress.find({ user: userId })
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

    // Separate into active recent items and completed items
    const activeProgressItems = [];
    const completedItems = [];
    const playlistIdsSeen = new Set();

    for (const doc of progressDocs) {
      if (!doc.video) continue;

      const duration = doc.durationSeconds || doc.video.durationSeconds || 0;
      const position = doc.lastPositionSeconds || 0;
      const percentage = duration > 0 ? Math.min(100, Math.round((position / duration) * 100)) : 0;
      const isCompleted = Boolean(doc.isCompleted);

      const item = {
        _id: doc._id,
        lastPositionSeconds: position,
        durationSeconds: duration,
        isCompleted,
        progressPercentage: percentage,
        updatedAt: doc.updatedAt,
        video: {
          _id: doc.video._id,
          title: doc.video.title,
          slug: doc.video.slug,
          durationSeconds: doc.video.durationSeconds,
          youtubeVideoId: doc.video.youtubeVideoId,
          order: doc.video.order,
          isActive: doc.video.isActive !== false,
          skill: doc.video.skill,
          playlist: doc.video.playlist
        }
      };

      activeProgressItems.push(item);

      if (isCompleted) {
        completedItems.push(item);
      }

      if (doc.video.playlist?._id) {
        playlistIdsSeen.add(doc.video.playlist._id.toString());
      }
    }

    // Continue Learning: Most recent unfinished video with progress, or latest active video
    const continueLearning =
      activeProgressItems.find((p) => !p.isCompleted && p.lastPositionSeconds > 0) ||
      activeProgressItems[0] ||
      null;

    // 2. Playlists with dynamic progress percentage
    const playlistSummaries = [];
    if (playlistIdsSeen.size > 0) {
      const activePlaylists = await Playlist.find({
        _id: { $in: Array.from(playlistIdsSeen) },
        isActive: true
      })
        .populate('skill', 'name slug icon')
        .lean();

      for (const pl of activePlaylists) {
        // Find all active constituent videos in this playlist
        const plVideos = await Video.find({
          playlist: pl._id,
          isActive: true
        })
          .select('_id')
          .lean();

        const totalVideos = plVideos.length;
        const plVideoIds = plVideos.map((v) => v._id.toString());

        // Count how many of these videos the user has marked isCompleted
        const completedCount = completedItems.filter(
          (c) => c.video?._id && plVideoIds.includes(c.video._id.toString())
        ).length;

        const progressPercentage =
          totalVideos > 0 ? Math.min(100, Math.round((completedCount / totalVideos) * 100)) : 0;

        playlistSummaries.push({
          _id: pl._id,
          title: pl.title,
          slug: pl.slug,
          description: pl.description,
          skill: pl.skill,
          totalVideos,
          completedVideos: completedCount,
          progressPercentage,
          isFinished: totalVideos > 0 && completedCount >= totalVideos
        });
      }
    }

    // 3. Quiz Statistics (Strictly limited to totalAttempted and X/5 marks scores)
    const userDoc = await User.findById(userId).select('quizScores').lean();
    const quizScoresList = userDoc?.quizScores || [];

    const quizStats = {
      totalAttempted: quizScoresList.length,
      scores: quizScoresList
        .slice()
        .reverse() // Most recent first
        .map((qs) => ({
          _id: qs._id,
          videoId: qs.video,
          videoTitle: qs.videoTitle || 'Practice Quiz',
          score: qs.score,
          totalQuestions: qs.totalQuestions || 5,
          scoreDisplay: qs.scoreDisplay || `${qs.score}/5 marks`,
          createdAt: qs.createdAt
        }))
    };

    return ApiResponse.ok(res, 'Dashboard overview retrieved successfully', {
      continueLearning,
      recent: activeProgressItems.slice(0, 10),
      completed: completedItems,
      totalCompleted: completedItems.length,
      playlists: playlistSummaries,
      quizStats
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getDashboardOverview
};
