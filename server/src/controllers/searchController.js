import { Skill } from '../models/Skill.js';
import { Playlist } from '../models/Playlist.js';
import { Video } from '../models/Video.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Escapes regex special characters to prevent regex injection or invalid regex errors.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search across active skills, playlists, and videos.
 * GET /api/search?q=query&type=all|skills|playlists|videos&limit=10
 */
export async function searchCatalog(req, res, next) {
  try {
    const rawQuery = req.query.q;
    const type = (req.query.type || 'all').toLowerCase();
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 && rawLimit <= 50 ? rawLimit : 10;

    // 1. Validation and bounds
    if (rawQuery === undefined || rawQuery === null) {
      throw ApiError.badRequest("Search query parameter 'q' is required");
    }

    const query = String(rawQuery).trim();

    if (query.length < 2) {
      throw ApiError.badRequest("Search query must be at least 2 characters long");
    }

    if (query.length > 100) {
      throw ApiError.badRequest("Search query cannot exceed 100 characters");
    }

    const validTypes = ['all', 'skills', 'playlists', 'videos'];
    if (!validTypes.includes(type)) {
      throw ApiError.badRequest(`Invalid type filter '${type}'. Valid options are: ${validTypes.join(', ')}`);
    }

    const escaped = escapeRegex(query);
    const searchRegex = new RegExp(escaped, 'i');

    const results = {
      skills: [],
      playlists: [],
      videos: []
    };

    // 2. Query Skills
    const searchSkills = type === 'all' || type === 'skills';
    // 3. Query Playlists
    const searchPlaylists = type === 'all' || type === 'playlists';
    // 4. Query Videos
    const searchVideos = type === 'all' || type === 'videos';

    const tasks = [];

    if (searchSkills) {
      tasks.push(
        Skill.find({
          isActive: true,
          $or: [
            { name: { $regex: searchRegex } },
            { description: { $regex: searchRegex } }
          ]
        })
          .populate('category', 'name slug icon')
          .sort({ order: 1, name: 1 })
          .limit(limit)
          .lean()
          .then((skills) => {
            results.skills = skills.map((skill) => ({
              type: 'skill',
              id: skill._id,
              name: skill.name,
              slug: skill.slug,
              description: skill.description || '',
              icon: skill.icon || '',
              category: skill.category ? {
                id: skill.category._id,
                name: skill.category.name,
                slug: skill.category.slug
              } : null,
              url: `/skills/${skill.slug}`
            }));
          })
      );
    }

    if (searchPlaylists) {
      tasks.push(
        Playlist.find({
          isActive: true,
          $or: [
            { title: { $regex: searchRegex } },
            { description: { $regex: searchRegex } }
          ]
        })
          .populate('skill', 'name slug isActive')
          .sort({ order: 1, title: 1 })
          .limit(limit)
          .lean()
          .then((playlists) => {
            // Ensure playlist's parent skill is active if populated
            results.playlists = playlists
              .filter((pl) => !pl.skill || pl.skill.isActive !== false)
              .map((playlist) => ({
                type: 'playlist',
                id: playlist._id,
                title: playlist.title,
                slug: playlist.slug,
                description: playlist.description || '',
                thumbnailUrl: playlist.thumbnailUrl || '',
                skill: playlist.skill ? {
                  id: playlist.skill._id,
                  name: playlist.skill.name,
                  slug: playlist.skill.slug
                } : null,
                url: `/playlists/${playlist._id}`
              }));
          })
      );
    }

    if (searchVideos) {
      tasks.push(
        Video.find({
          isActive: true,
          $or: [
            { title: { $regex: searchRegex } },
            { description: { $regex: searchRegex } }
          ]
        })
          .populate('skill', 'name slug isActive')
          .populate('playlist', 'title slug isActive')
          .sort({ order: 1, title: 1 })
          .limit(limit)
          .lean()
          .then((videos) => {
            // Ensure video's parent skill is active if populated
            results.videos = videos
              .filter((v) => !v.skill || v.skill.isActive !== false)
              .map((video) => ({
                type: 'video',
                id: video._id,
                title: video.title,
                slug: video.slug,
                description: video.description || '',
                durationSeconds: video.durationSeconds,
                hasTranscript: video.hasTranscript,
                thumbnailUrl: video.thumbnailUrl || '',
                skill: video.skill ? {
                  id: video.skill._id,
                  name: video.skill.name,
                  slug: video.skill.slug
                } : null,
                playlist: video.playlist ? {
                  id: video.playlist._id,
                  title: video.playlist.title,
                  slug: video.playlist.slug
                } : null,
                url: `/videos/${video._id}`
              }));
          })
      );
    }

    await Promise.all(tasks);

    const totalResults = results.skills.length + results.playlists.length + results.videos.length;

    return ApiResponse.ok(res, 'Search results retrieved successfully', {
      query,
      type,
      totalResults,
      counts: {
        skills: results.skills.length,
        playlists: results.playlists.length,
        videos: results.videos.length
      },
      results
    });
  } catch (err) {
    next(err);
  }
}

export default {
  searchCatalog
};
