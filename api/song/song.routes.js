import express from 'express';
import { songService } from './song.service.js';
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
router.put('/:songId', updateSong);
router.post('/', addSong);
router.delete('/:songId', removeSong); // make for admin only in the future

export const songRoutes = router;
