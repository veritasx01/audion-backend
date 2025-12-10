import express from 'express';
import {
  addPlaylist,
  getPlaylist,
  getPlaylists,
  removePlaylist,
  updatePlaylist,
} from './playlist.controller.js';

const router = express.Router();

// Routes for /api/playlist
router.get('/', getPlaylists);
router.get('/:playlistId', getPlaylist);
router.delete('/:playlistId', removePlaylist);
router.patch('/:playlistId', updatePlaylist);
router.post('/', addPlaylist);

export const playlistRoutes = router;
