import express from 'express';
import { requireAuth, requireAdmin } from '../../middleware/require-auth.js';
import {
  getUser,
  getDefaultUser,
  getUsers,
  deleteUser,
  updateUser,
} from './user.controller.js';

const router = express.Router();

// Routes for /api/user
router.get('/', getUsers);
router.get('/:id', getUser);
router.get('/defaultUser', getDefaultUser); // temporary route for default user until auth is implemented end-to-end
router.patch('/:id', requireAuth, updateUser);
router.delete('/:id', requireAdmin, deleteUser);

export const userRoutes = router;
