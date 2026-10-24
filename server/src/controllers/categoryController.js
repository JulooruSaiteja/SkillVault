import { Category } from '../models/Category.js';
import { Skill } from '../models/Skill.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * List all active categories.
 * Supports optional ?includeSkills=true query parameter to embed skills.
 */
export async function getCategories(req, res, next) {
  try {
    const { includeSkills } = req.query;

    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();

    if (includeSkills === 'true' || includeSkills === '1') {
      const categoryIds = categories.map((c) => c._id);
      const skills = await Skill.find({
        category: { $in: categoryIds },
        isActive: true
      })
        .sort({ order: 1, name: 1 })
        .lean();

      // Group skills under their respective categories
      const skillsByCategory = skills.reduce((acc, skill) => {
        const catId = skill.category.toString();
        if (!acc[catId]) {
          acc[catId] = [];
        }
        acc[catId].push(skill);
        return acc;
      }, {});

      const enrichedCategories = categories.map((cat) => ({
        ...cat,
        skills: skillsByCategory[cat._id.toString()] || [],
        skillsCount: (skillsByCategory[cat._id.toString()] || []).length
      }));

      return ApiResponse.ok(res, 'Categories retrieved successfully', {
        categories: enrichedCategories
      });
    }

    return ApiResponse.ok(res, 'Categories retrieved successfully', {
      categories
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get category details by slug including its active skills.
 */
export async function getCategoryBySlug(req, res, next) {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      slug: slug.toLowerCase(),
      isActive: true
    }).lean();

    if (!category) {
      throw ApiError.notFound(`Category not found: ${slug}`);
    }

    const skills = await Skill.find({
      category: category._id,
      isActive: true
    })
      .sort({ order: 1, name: 1 })
      .lean();

    return ApiResponse.ok(res, 'Category details retrieved successfully', {
      category: {
        ...category,
        skills,
        skillsCount: skills.length
      }
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getCategories,
  getCategoryBySlug
};
