import mongoose from 'mongoose';
import { Skill } from '../models/Skill.js';
import { Category } from '../models/Category.js';
import { Playlist } from '../models/Playlist.js';
import { Video } from '../models/Video.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * List active skills.
 * Supports optional category filtering via ?category=slug_or_id.
 */
export async function getSkills(req, res, next) {
  try {
    const { category: categoryParam } = req.query;
    const filter = { isActive: true };

    if (categoryParam) {
      if (mongoose.Types.ObjectId.isValid(categoryParam)) {
        filter.category = categoryParam;
      } else {
        const cat = await Category.findOne({
          slug: categoryParam.toLowerCase(),
          isActive: true
        });
        if (cat) {
          filter.category = cat._id;
        } else {
          // If category filter does not match any category, return empty list
          return ApiResponse.ok(res, 'Skills retrieved successfully', { skills: [] });
        }
      }
    }

    const skills = await Skill.find(filter)
      .populate('category', 'name slug icon')
      .sort({ order: 1, name: 1 })
      .lean();

    return ApiResponse.ok(res, 'Skills retrieved successfully', { skills });
  } catch (err) {
    next(err);
  }
}

/**
 * Get skill details by slug, including associated active playlists and videos.
 */
export async function getSkillBySlug(req, res, next) {
  try {
    const { slug } = req.params;

    const skill = await Skill.findOne({
      slug: slug.toLowerCase(),
      isActive: true
    })
      .populate('category', 'name slug icon description')
      .lean();

    if (!skill) {
      throw ApiError.notFound(`Skill not found: ${slug}`);
    }

    // Retrieve active playlists for this skill
    const playlists = await Playlist.find({
      skill: skill._id,
      isActive: true
    })
      .sort({ order: 1, title: 1 })
      .lean();

    // Retrieve active videos for this skill
    const videos = await Video.find({
      skill: skill._id,
      isActive: true
    })
      .sort({ order: 1, title: 1 })
      .lean();

    return ApiResponse.ok(res, 'Skill details retrieved successfully', {
      skill: {
        ...skill,
        playlists,
        videos,
        playlistsCount: playlists.length,
        videosCount: videos.length
      }
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getSkills,
  getSkillBySlug
};
