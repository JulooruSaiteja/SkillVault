import { Router } from 'express';
import {
  getCategories,
  getCategoryBySlug
} from '../controllers/categoryController.js';

const router = Router();

// Public routes for browsing categories
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

export default router;
