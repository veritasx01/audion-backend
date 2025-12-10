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

router.get('/', getSongs); // needs querying
router.get('/:songId', getSong);
router.patch('/:songId', requireAuth, updateSong);
router.post('/', requireAuth, addSong);
router.delete('/:songId', requireAdmin, removeSong); // make for admin only in the future

export const songRoutes = router;
