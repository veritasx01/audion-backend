import express from 'express';
import {
  addPlaylist,
  getPlaylist,
  getPlaylists,
  removePlaylist,
  updatePlaylist,
} from './playlist.controller.js';

const router = express.Router();

router.get('/', getPlaylists);
router.get('/:playlistId', getPlaylist);
router.delete('/:playlistId', removePlaylist);
router.put('/:playlistId', updatePlaylist);
router.post('/', addPlaylist);
/*
router.get('/',);
router.get('/:playlistId',);
router.delete('/:playlistId',);
router.put('/', );
router.post('/', );
*/
export const playlistRoutes = router;
