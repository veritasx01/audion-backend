import { userService } from './user.service.js';
import { loggerService } from '../../services/logger.service.js';
import { AuthErrors } from '../auth/auth.service.js';

export async function getUser(req, res) {
  try {
    const user = await userService.getById(req.params.id);
    res.send(user);
  } catch (err) {
    loggerService.error('Failed to get user', err);
    res.status(400).send({ err: 'Failed to get user' });
  }
}

export async function getDefaultUser(req, res) {
  try {
    const defaultUser = await userService.getDefaultUser();
    res.json(defaultUser);
  } catch (err) {
    loggerService.error('Failed to get default user', err);
    res.status(400).send({ err: 'Failed to get default user' });
  }
}

export async function getUsers(req, res) {
  try {
    const filterBy = {}; // Add filtering logic if needed based on req.query
    const users = await userService.query(filterBy);
    res.send(users);
  } catch (err) {
    loggerService.error('Failed to get users', err);
    res.status(400).send({ err: 'Failed to get users' });
  }
}

export async function deleteUser(req, res) {
  try {
    const deleteSucceeded = await userService.remove(req.params.id);
    if (!deleteSucceeded) {
      return res.status(404).send({ err: 'User not found' });
    }
    res.status(204).send({ msg: 'Deleted successfully' });
  } catch (err) {
    loggerService.error('Failed to delete user', err);
    res.status(400).send({ err: 'Failed to delete user' });
  }
}

export async function updateUser(req, res) {
  try {
    const user = { ...req.body, _id: req.params.id };
    const savedUser = await userService.update(user);
    res.send(savedUser);
  } catch (err) {
    loggerService.error('Failed to update user', err);
    if (err.message === AuthErrors.ACCESS_FORBIDDEN) {
      res.status(403).send({ err: err.message });
    } else if (err.message === AuthErrors.EMAIL_IN_USE) {
      res.status(409).send({ err: err.message });
    } else {
      res.status(400).send({ err: 'Failed to update user' });
    }
  }
}
