import express from 'express';
import { requireAuth, requireAdmin } from '../../middleware/require-auth.js';
import {
  getUser,
  getDefaultUser,
  getUsers,
  deleteUser,
  updateUser,
  addPlaylistToUserLibrary,
  removePlaylistFromUserLibrary,
} from './user.controller.js';

const router = express.Router();

// Routes for /api/user
router.get('/', getUsers);
router.get('/defaultUser', getDefaultUser); // temporary route for default user until auth is implemented end-to-end
router.get('/:id', getUser);
router.post('/:id/playlist/:playlistId', addPlaylistToUserLibrary);
router.patch('/:id', requireAuth, updateUser);
router.delete('/:id', requireAdmin, deleteUser);
router.delete('/:id/playlist/:playlistId', removePlaylistFromUserLibrary);

export const userRoutes = router;
