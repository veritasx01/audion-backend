import express from 'express';
import { requireAuth, requireAdmin } from '../../middleware/require-auth.js';
import {
  getSongs,
  getSong,
  addSong,
  updateSong,
  removeSong,
} from './song.controller.js';

const router = express.Router();

// Routes for /api/song
router.get('/', getSongs); // needs querying
router.get('/:songId', getSong);
router.patch('/:songId', updateSong);
router.post('/', addSong);
router.delete('/:songId', requireAdmin, removeSong);

export const songRoutes = router;
