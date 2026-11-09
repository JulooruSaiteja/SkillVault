import { Router } from 'express';
import {
  getCategories,
  getCategoryBySlug,
  getPublicStats
} from '../controllers/categoryController.js';

const router = Router();

// Public routes for browsing categories and platform stats
router.get('/stats', getPublicStats);
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

export default router;
