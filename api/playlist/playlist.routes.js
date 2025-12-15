import express from 'express';
import {
  addPlaylist,
  getPlaylist,
  getPlaylists,
  getPlaylistSongFullDetails,
  removePlaylist,
  updatePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
} from './playlist.controller.js';

const router = express.Router();

// Routes for /api/playlist
router.get('/', getPlaylists);
router.get('/:playlistId', getPlaylist);
router.get('/:playlistId/song/:songId', getPlaylistSongFullDetails);
router.delete('/:playlistId', removePlaylist);
router.patch('/:playlistId', updatePlaylist);
router.post('/', addPlaylist);
router.post('/:playlistId/song', addSongToPlaylist);
router.delete('/:playlistId/song/:songId', removeSongFromPlaylist);

export const playlistRoutes = router;
