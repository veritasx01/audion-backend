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

export async function addPlaylistToUserLibrary(req, res) {
  const { id: userId, playlistId } = req.params;
  try {
    const additionSucceeded = await userService.addPlaylistToUserLibrary(
      userId,
      playlistId
    );
    if (!additionSucceeded) {
      loggerService.error(
        `Failed to add playlist ${playlistId} to user ${userId} library`
      );
      return res.status(404).send({ err: 'User or Playlist not found' });
    }
    res
      .status(201)
      .send({ msg: 'Playlist added to user library successfully' });
  } catch (err) {
    loggerService.error('Failed to add playlist to user library', err);
    res.status(400).send({
      err: `Failed to add playlist ${playlistId} to user ${userId} library`,
    });
  }
}

export async function removePlaylistFromUserLibrary(req, res) {
  const { id: userId, playlistId } = req.params;
  try {
    const removalSucceeded = await userService.removePlaylistFromUserLibrary(
      userId,
      playlistId
    );
    if (!removalSucceeded) {
      loggerService.error(
        `Failed to remove playlist ${playlistId} from user ${userId} library`
      );
      return res.status(404).send({ err: 'User or Playlist not found' });
    }
    res
      .status(200)
      .send({ msg: 'Playlist removed from user library successfully' });
  } catch (err) {
    loggerService.error('Failed to remove playlist from user library', err);
    res.status(400).send({
      err: `Failed to remove playlist ${playlistId} from user ${userId} library`,
    });
  }
}
