import express from 'express';
import { requireAuth, requireAdmin } from '../../middleware/require-auth.js';
import {
  getUser,
  getUsers,
  deleteUser,
  updateUser,
} from './user.controller.js';

const router = express.Router();

// Routes for /api/user
router.get('/', getUsers);
router.get('/:id', getUser);
router.patch('/:id', requireAdmin, updateUser);
router.delete('/:id', requireAdmin, deleteUser);

export const userRoutes = router;
