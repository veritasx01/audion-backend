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

router.get('/', getSongs);
router.get('/:songId', getSong);
router.put('/:songId', updateSong);
router.post('/', addSong);
//router.delete('/:songId', removeSong);

export const songRoutes = router;
