import { Router } from 'express';
import {
  getSkills,
  getSkillBySlug
} from '../controllers/skillController.js';

const router = Router();

// Public routes for browsing skills
router.get('/', getSkills);
router.get('/:slug', getSkillBySlug);

export default router;
