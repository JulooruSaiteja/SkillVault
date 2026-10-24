import express from 'express';
import { searchCatalog } from '../controllers/searchController.js';

const router = express.Router();

/**
 * @route   GET /api/search
 * @desc    Search active skills, playlists, and videos with query validation and type filtering
 * @access  Public
 */
router.get('/', searchCatalog);

export default router;
