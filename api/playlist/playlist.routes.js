import express from 'express';
import { getPlaylist, getPlaylists } from './playlist.controller.js';

const router = express.Router();

router.get('/', getPlaylists);
router.get('/:playlistId', getPlaylist);
router.delete('/:playlistId', (req, res) => {
  console.log('delete playlist by id');
  res.status(200).send();
});
router.put('/', (req, res) => {
  console.log('make new playlist');
  res.status(200).send();
});
router.post('/', (req, res) => {
  console.log('update playlist');
  res.status(200).send();
});
/*
router.get('/',);
router.get('/:playlistId',);
router.delete('/:playlistId',);
router.put('/', );
router.post('/', );
*/
export const playlistRoutes = router;