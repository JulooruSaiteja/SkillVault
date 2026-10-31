import express from 'express';
import { getDashboardOverview } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Dashboard overview is strictly protected and isolated per authenticated learner
router.get('/', requireAuth, getDashboardOverview);

export default router;
