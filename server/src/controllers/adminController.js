import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Skill } from '../models/Skill.js';
import { Playlist } from '../models/Playlist.js';
import { Video } from '../models/Video.js';
import { User } from '../models/User.js';
import { VideoProgress } from '../models/VideoProgress.js';
import { Bookmark } from '../models/Bookmark.js';
import { Note } from '../models/Note.js';
import { Quiz } from '../models/Quiz.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import slugify from '../utils/slugify.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// 1. Overview & System Statistics
// ============================================================================

export async function getAdminStats(req, res, next) {
  try {
    const [categoriesCount, skillsCount, playlistsCount, videosCount, usersCount] =
      await Promise.all([
        Category.countDocuments(),
        Skill.countDocuments(),
        Playlist.countDocuments(),
        Video.countDocuments(),
        User.countDocuments()
      ]);

    const [activeVideosCount, videosWithTranscriptCount] = await Promise.all([
      Video.countDocuments({ isActive: true }),
      Video.countDocuments({ hasTranscript: true })
    ]);

    return ApiResponse.ok(res, 'Admin statistics retrieved successfully', {
      stats: {
        categories: categoriesCount,
        skills: skillsCount,
        playlists: playlistsCount,
        videos: videosCount,
        users: usersCount,
        activeVideos: activeVideosCount,
        videosWithTranscript: videosWithTranscriptCount
      }
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 2. Categories Administration
// ============================================================================

export async function getAdminCategories(req, res, next) {
  try {
    const categories = await Category.find()
      .sort({ order: 1, name: 1 })
      .lean();

    // Enrich with count of skills assigned to each category
    const enriched = await Promise.all(
      categories.map(async (cat) => {
        const skillsCount = await Skill.countDocuments({ category: cat._id });
        return { ...cat, skillsCount };
      })
    );

    return ApiResponse.ok(res, 'Categories retrieved for administration', {
      categories: enriched
    });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, description, icon, order, isActive } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw ApiError.badRequest('Category name is required');
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({ name: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') });
    if (existing) {
      throw ApiError.conflict('A category with this name already exists');
    }

    const category = await Category.create({
      name: trimmedName,
      slug: slugify(trimmedName),
      description: description ? description.trim() : '',
      icon: icon ? icon.trim() : '',
      order: typeof order === 'number' ? order : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    return ApiResponse.created(res, 'Category created successfully', { category });
  } catch (err) {
    if (err.code === 11000) {
      return next(ApiError.conflict('A category with this name or slug already exists'));
    }
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid category ID');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    const { name, description, icon, order, isActive } = req.body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw ApiError.badRequest('Category name cannot be empty');
      }
      const existing = await Category.findOne({
        name: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i'),
        _id: { $ne: category._id }
      });
      if (existing) {
        throw ApiError.conflict('Another category already has this name');
      }
      category.name = trimmedName;
      category.slug = slugify(trimmedName);
    }

    if (description !== undefined) category.description = description.trim();
    if (icon !== undefined) category.icon = icon.trim();
    if (order !== undefined) category.order = Number(order) || 0;
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    return ApiResponse.ok(res, 'Category updated successfully', { category });
  } catch (err) {
    if (err.code === 11000) {
      return next(ApiError.conflict('Another category with this name or slug already exists'));
    }
    next(err);
  }
}

export async function toggleCategoryStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid category ID');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    category.isActive = !category.isActive;
    await category.save();

    return ApiResponse.ok(
      res,
      `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      { category }
    );
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid category ID');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Check child references
    const skillsCount = await Skill.countDocuments({ category: category._id });
    if (skillsCount > 0) {
      throw ApiError.conflict(
        `Cannot hard-delete category '${category.name}' because ${skillsCount} skill(s) reference it. Please reassign or delete the skills first, or deactivate the category instead.`
      );
    }

    await Category.findByIdAndDelete(id);

    return ApiResponse.ok(res, `Category '${category.name}' deleted successfully`);
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 3. Skills Administration
// ============================================================================

export async function getAdminSkills(req, res, next) {
  try {
    const skills = await Skill.find()
      .populate('category', 'name slug')
      .sort({ order: 1, name: 1 })
      .lean();

    const enriched = await Promise.all(
      skills.map(async (sk) => {
        const [playlistsCount, videosCount] = await Promise.all([
          Playlist.countDocuments({ skill: sk._id }),
          Video.countDocuments({ skill: sk._id })
        ]);
        return { ...sk, playlistsCount, videosCount };
      })
    );

    return ApiResponse.ok(res, 'Skills retrieved for administration', {
      skills: enriched
    });
  } catch (err) {
    next(err);
  }
}

export async function createSkill(req, res, next) {
  try {
    const { name, description, category, icon, order, isActive } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw ApiError.badRequest('Skill name is required');
    }

    if (!category || !mongoose.Types.ObjectId.isValid(category)) {
      throw ApiError.badRequest('Valid parent category ID is required');
    }

    const parentCategory = await Category.findById(category);
    if (!parentCategory) {
      throw ApiError.notFound('Parent category not found');
    }

    const trimmedName = name.trim();
    const skill = await Skill.create({
      name: trimmedName,
      slug: slugify(trimmedName),
      description: description ? description.trim() : '',
      category: parentCategory._id,
      icon: icon ? icon.trim() : '',
      order: typeof order === 'number' ? order : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    const populated = await Skill.findById(skill._id).populate('category', 'name slug');

    return ApiResponse.created(res, 'Skill created successfully', { skill: populated });
  } catch (err) {
    next(err);
  }
}

export async function updateSkill(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid skill ID');
    }

    const skill = await Skill.findById(id);
    if (!skill) {
      throw ApiError.notFound('Skill not found');
    }

    const { name, description, category, icon, order, isActive } = req.body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) throw ApiError.badRequest('Skill name cannot be empty');
      skill.name = trimmedName;
      skill.slug = slugify(trimmedName);
    }

    if (category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        throw ApiError.badRequest('Invalid parent category ID');
      }
      const parent = await Category.findById(category);
      if (!parent) throw ApiError.notFound('Parent category not found');
      skill.category = parent._id;
    }

    if (description !== undefined) skill.description = description.trim();
    if (icon !== undefined) skill.icon = icon.trim();
    if (order !== undefined) skill.order = Number(order) || 0;
    if (isActive !== undefined) skill.isActive = Boolean(isActive);

    await skill.save();

    const populated = await Skill.findById(skill._id).populate('category', 'name slug');

    return ApiResponse.ok(res, 'Skill updated successfully', { skill: populated });
  } catch (err) {
    next(err);
  }
}

export async function toggleSkillStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid skill ID');
    }

    const skill = await Skill.findById(id);
    if (!skill) throw ApiError.notFound('Skill not found');

    skill.isActive = !skill.isActive;
    await skill.save();

    return ApiResponse.ok(
      res,
      `Skill ${skill.isActive ? 'activated' : 'deactivated'} successfully`,
      { skill }
    );
  } catch (err) {
    next(err);
  }
}

export async function deleteSkill(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid skill ID');
    }

    const skill = await Skill.findById(id);
    if (!skill) throw ApiError.notFound('Skill not found');

    const [playlistsCount, videosCount] = await Promise.all([
      Playlist.countDocuments({ skill: skill._id }),
      Video.countDocuments({ skill: skill._id })
    ]);

    if (playlistsCount > 0 || videosCount > 0) {
      throw ApiError.conflict(
        `Cannot hard-delete skill '${skill.name}' because ${playlistsCount} playlist(s) and ${videosCount} video(s) reference it. Please delete or reassign them first, or deactivate the skill instead.`
      );
    }

    await Skill.findByIdAndDelete(id);

    return ApiResponse.ok(res, `Skill '${skill.name}' deleted successfully`);
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 4. Playlists Administration
// ============================================================================

export async function getAdminPlaylists(req, res, next) {
  try {
    const playlists = await Playlist.find()
      .populate('skill', 'name slug icon')
      .sort({ order: 1, title: 1 })
      .lean();

    const enriched = await Promise.all(
      playlists.map(async (pl) => {
        const videosCount = await Video.countDocuments({ playlist: pl._id });
        return { ...pl, videosCount };
      })
    );

    return ApiResponse.ok(res, 'Playlists retrieved for administration', {
      playlists: enriched
    });
  } catch (err) {
    next(err);
  }
}

export async function createPlaylist(req, res, next) {
  try {
    const { title, description, skill, externalYoutubePlaylistId, thumbnailUrl, order, isActive } =
      req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw ApiError.badRequest('Playlist title is required');
    }

    if (!skill || !mongoose.Types.ObjectId.isValid(skill)) {
      throw ApiError.badRequest('Valid associated skill ID is required');
    }

    const associatedSkill = await Skill.findById(skill);
    if (!associatedSkill) {
      throw ApiError.notFound('Associated skill not found');
    }

    const trimmedTitle = title.trim();
    const playlist = await Playlist.create({
      title: trimmedTitle,
      slug: slugify(trimmedTitle),
      description: description ? description.trim() : '',
      skill: associatedSkill._id,
      externalYoutubePlaylistId: externalYoutubePlaylistId ? externalYoutubePlaylistId.trim() : null,
      thumbnailUrl: thumbnailUrl ? thumbnailUrl.trim() : '',
      order: typeof order === 'number' ? order : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    const populated = await Playlist.findById(playlist._id).populate('skill', 'name slug icon');

    return ApiResponse.created(res, 'Playlist created successfully', { playlist: populated });
  } catch (err) {
    next(err);
  }
}

export async function updatePlaylist(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid playlist ID');
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) throw ApiError.notFound('Playlist not found');

    const { title, description, skill, externalYoutubePlaylistId, thumbnailUrl, order, isActive } =
      req.body;

    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) throw ApiError.badRequest('Playlist title cannot be empty');
      playlist.title = trimmedTitle;
      playlist.slug = slugify(trimmedTitle);
    }

    if (skill !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(skill)) {
        throw ApiError.badRequest('Invalid skill ID');
      }
      const associatedSkill = await Skill.findById(skill);
      if (!associatedSkill) throw ApiError.notFound('Associated skill not found');
      playlist.skill = associatedSkill._id;
    }

    if (description !== undefined) playlist.description = description.trim();
    if (externalYoutubePlaylistId !== undefined) {
      playlist.externalYoutubePlaylistId = externalYoutubePlaylistId ? externalYoutubePlaylistId.trim() : null;
    }
    if (thumbnailUrl !== undefined) playlist.thumbnailUrl = thumbnailUrl.trim();
    if (order !== undefined) playlist.order = Number(order) || 0;
    if (isActive !== undefined) playlist.isActive = Boolean(isActive);

    await playlist.save();

    const populated = await Playlist.findById(playlist._id).populate('skill', 'name slug icon');

    return ApiResponse.ok(res, 'Playlist updated successfully', { playlist: populated });
  } catch (err) {
    next(err);
  }
}

export async function togglePlaylistStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid playlist ID');
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) throw ApiError.notFound('Playlist not found');

    playlist.isActive = !playlist.isActive;
    await playlist.save();

    return ApiResponse.ok(
      res,
      `Playlist ${playlist.isActive ? 'activated' : 'deactivated'} successfully`,
      { playlist }
    );
  } catch (err) {
    next(err);
  }
}

export async function deletePlaylist(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid playlist ID');
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) throw ApiError.notFound('Playlist not found');

    const videosCount = await Video.countDocuments({ playlist: playlist._id });
    if (videosCount > 0) {
      throw ApiError.conflict(
        `Cannot hard-delete playlist '${playlist.title}' because ${videosCount} video(s) are assigned to it. Please reassign or delete the constituent videos first, or deactivate the playlist instead.`
      );
    }

    await Playlist.findByIdAndDelete(id);

    return ApiResponse.ok(res, `Playlist '${playlist.title}' deleted successfully`);
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 5. Videos Administration & Transcript Management
// ============================================================================

export async function getAdminVideos(req, res, next) {
  try {
    const videos = await Video.find()
      .populate('skill', 'name slug')
      .populate('playlist', 'title slug')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return ApiResponse.ok(res, 'Videos retrieved for administration', {
      videos
    });
  } catch (err) {
    next(err);
  }
}

export async function createVideo(req, res, next) {
  try {
    const {
      title,
      description,
      skill,
      playlist,
      youtubeVideoId,
      durationSeconds,
      transcript,
      thumbnailUrl,
      order,
      isActive
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw ApiError.badRequest('Video title is required');
    }

    if (!youtubeVideoId || typeof youtubeVideoId !== 'string' || !youtubeVideoId.trim()) {
      throw ApiError.badRequest('YouTube video ID is required');
    }

    if (durationSeconds === undefined || durationSeconds === null || Number(durationSeconds) < 0) {
      throw ApiError.badRequest('Valid non-negative duration in seconds is required');
    }

    if (!skill || !mongoose.Types.ObjectId.isValid(skill)) {
      throw ApiError.badRequest('Valid associated skill ID is required');
    }

    const associatedSkill = await Skill.findById(skill);
    if (!associatedSkill) {
      throw ApiError.notFound('Associated skill not found');
    }

    let playlistId = null;
    if (playlist) {
      if (!mongoose.Types.ObjectId.isValid(playlist)) {
        throw ApiError.badRequest('Invalid playlist ID');
      }
      const associatedPlaylist = await Playlist.findById(playlist);
      if (!associatedPlaylist) {
        throw ApiError.notFound('Associated playlist not found');
      }
      playlistId = associatedPlaylist._id;
    }

    const trimmedTitle = title.trim();
    const trimmedTranscript = transcript && typeof transcript === 'string' ? transcript.trim() : null;

    const video = await Video.create({
      title: trimmedTitle,
      slug: slugify(trimmedTitle),
      description: description ? description.trim() : '',
      skill: associatedSkill._id,
      playlist: playlistId,
      youtubeVideoId: youtubeVideoId.trim(),
      durationSeconds: Math.round(Number(durationSeconds)),
      transcript: trimmedTranscript,
      hasTranscript: Boolean(trimmedTranscript && trimmedTranscript.length > 0),
      thumbnailUrl: thumbnailUrl ? thumbnailUrl.trim() : '',
      order: typeof order === 'number' ? order : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    const populated = await Video.findById(video._id)
      .populate('skill', 'name slug')
      .populate('playlist', 'title slug');

    return ApiResponse.created(res, 'Video created successfully', { video: populated });
  } catch (err) {
    next(err);
  }
}

export async function updateVideo(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid video ID');
    }

    const video = await Video.findById(id);
    if (!video) throw ApiError.notFound('Video not found');

    const {
      title,
      description,
      skill,
      playlist,
      youtubeVideoId,
      durationSeconds,
      transcript,
      thumbnailUrl,
      order,
      isActive
    } = req.body;

    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) throw ApiError.badRequest('Video title cannot be empty');
      video.title = trimmedTitle;
      video.slug = slugify(trimmedTitle);
    }

    if (skill !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(skill)) {
        throw ApiError.badRequest('Invalid skill ID');
      }
      const associatedSkill = await Skill.findById(skill);
      if (!associatedSkill) throw ApiError.notFound('Associated skill not found');
      video.skill = associatedSkill._id;
    }

    if (playlist !== undefined) {
      if (playlist === null || playlist === '') {
        video.playlist = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(playlist)) {
          throw ApiError.badRequest('Invalid playlist ID');
        }
        const associatedPlaylist = await Playlist.findById(playlist);
        if (!associatedPlaylist) throw ApiError.notFound('Associated playlist not found');
        video.playlist = associatedPlaylist._id;
      }
    }

    if (youtubeVideoId !== undefined) {
      const trimmedYt = youtubeVideoId.trim();
      if (!trimmedYt) throw ApiError.badRequest('YouTube video ID cannot be empty');
      video.youtubeVideoId = trimmedYt;
    }

    if (durationSeconds !== undefined) {
      const dur = Number(durationSeconds);
      if (isNaN(dur) || dur < 0) {
        throw ApiError.badRequest('Duration must be a non-negative number');
      }
      video.durationSeconds = Math.round(dur);
    }

    if (transcript !== undefined) {
      const trimmedTranscript = transcript && typeof transcript === 'string' ? transcript.trim() : null;
      video.transcript = trimmedTranscript;
      video.hasTranscript = Boolean(trimmedTranscript && trimmedTranscript.length > 0);
    }

    if (description !== undefined) video.description = description.trim();
    if (thumbnailUrl !== undefined) video.thumbnailUrl = thumbnailUrl.trim();
    if (order !== undefined) video.order = Number(order) || 0;
    if (isActive !== undefined) video.isActive = Boolean(isActive);

    await video.save();

    const populated = await Video.findById(video._id)
      .populate('skill', 'name slug')
      .populate('playlist', 'title slug');

    return ApiResponse.ok(res, 'Video updated successfully', { video: populated });
  } catch (err) {
    next(err);
  }
}

/**
 * Dedicated transcript editor endpoint.
 */
export async function updateVideoTranscript(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid video ID');
    }

    const video = await Video.findById(id);
    if (!video) throw ApiError.notFound('Video not found');

    const { transcript } = req.body;
    const trimmed = typeof transcript === 'string' ? transcript.trim() : null;

    video.transcript = trimmed && trimmed.length > 0 ? trimmed : null;
    video.hasTranscript = Boolean(video.transcript);

    await video.save();

    return ApiResponse.ok(res, 'Video transcript updated successfully', {
      video: {
        _id: video._id,
        title: video.title,
        transcript: video.transcript,
        hasTranscript: video.hasTranscript
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleVideoStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid video ID');
    }

    const video = await Video.findById(id);
    if (!video) throw ApiError.notFound('Video not found');

    video.isActive = !video.isActive;
    await video.save();

    return ApiResponse.ok(
      res,
      `Video lesson ${video.isActive ? 'activated' : 'deactivated'} successfully`,
      { video }
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a video.
 * Enforces critical deactivation policy:
 * Soft deactivation controls; PREVENT hard delete when user history references exist
 * (VideoProgress, Bookmark, Note, Quiz).
 */
export async function deleteVideo(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid video ID');
    }

    const video = await Video.findById(id);
    if (!video) throw ApiError.notFound('Video not found');

    // Check learner history references
    const [progressCount, bookmarkCount, noteCount, quizCount] = await Promise.all([
      VideoProgress.countDocuments({ video: video._id }),
      Bookmark.countDocuments({ video: video._id }),
      Note.countDocuments({ video: video._id }),
      Quiz.countDocuments({ video: video._id })
    ]);

    const reasons = [];
    if (progressCount > 0) reasons.push(`${progressCount} learner playback record(s)`);
    if (bookmarkCount > 0) reasons.push(`${bookmarkCount} bookmark(s)`);
    if (noteCount > 0) reasons.push(`${noteCount} AI note(s)`);
    if (quizCount > 0) reasons.push(`${quizCount} practice quiz(zes)`);

    if (reasons.length > 0) {
      throw ApiError.conflict(
        `Cannot hard-delete video '${video.title}' because user history references exist: ${reasons.join(', ')}. Please use soft deactivation (isActive: false) instead to preserve learner history.`
      );
    }

    await Video.findByIdAndDelete(id);

    return ApiResponse.ok(res, `Video '${video.title}' deleted successfully`);
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 6. Users Administration
// ============================================================================

export async function getAdminUsers(req, res, next) {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const enriched = users.map((u) => ({
      ...u,
      quizzesAttemptedCount: (u.quizScores || []).length
    }));

    return ApiResponse.ok(res, 'Users retrieved for administration', {
      users: enriched,
      totalCount: enriched.length
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === id) {
      throw ApiError.badRequest('You cannot deactivate your own administrative account');
    }

    const user = await User.findById(id);
    if (!user) throw ApiError.notFound('User not found');

    user.isActive = !user.isActive;
    await user.save();

    return ApiResponse.ok(
      res,
      `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      }
    );
  } catch (err) {
    next(err);
  }
}

export default {
  getAdminStats,
  getAdminCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  getAdminSkills,
  createSkill,
  updateSkill,
  toggleSkillStatus,
  deleteSkill,
  getAdminPlaylists,
  createPlaylist,
  updatePlaylist,
  togglePlaylistStatus,
  deletePlaylist,
  getAdminVideos,
  createVideo,
  updateVideo,
  updateVideoTranscript,
  toggleVideoStatus,
  deleteVideo,
  getAdminUsers,
  toggleUserStatus
};
