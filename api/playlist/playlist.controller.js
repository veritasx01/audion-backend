import { userService } from '../user/user.service.js';
import { playlistService } from './playlist.service.js';
import { loggerService } from '../../services/logger.service.js';

export async function getPlaylists(req, res) {
  try {
    const filterBy = {
      playlistIds: req.query.playlistIds?.split(','),
      searchString: req.query.q,
      genre: req.query.genre,
    };
    const sortBy = req.query.sortBy || '';
    const sortDir = +req.query.sortDir || 1; // 1 for ascending, -1 for descending

    const playlists = await playlistService.query(filterBy, sortBy, sortDir);
    res.json(playlists);
  } catch (err) {
    loggerService.error(err);
    res.status(400).send({ error: err });
  }
}

export async function getPlaylist(req, res) {
  const { playlistId } = req.params;
  try {
    const playlist = await playlistService.getById(playlistId);
    if (!playlist) {
      res.status(404).send({ error: 'Resource not found' });
    } else res.json(playlist);
  } catch (err) {
    loggerService.error(`Failed to get playlist ${playlistId}`, err);
    res.status(400).send({ error: err });
  }
}

export async function updatePlaylist(req, res) {
  const { playlistId } = req.params;
  const { loggedinUser, body: playlistData } = req;
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).send({ error: 'Request body is missing' });
  }
  if (!playlistService.playlistExists(playlistId)) {
    return res.status(404).send({ error: 'Resource does not exist' });
  }
  let playlist = {
    _id: playlistId,
    title: playlistData.title,
    description: playlistData.description,
    thumbnail: playlistData.thumbnail,
    songs: playlistData.songs,
  };
  // only update fields which have content
  playlist = Object.fromEntries(
    Object.entries(playlist).filter(
      ([key, value]) => value !== null && value !== undefined
    )
  );
  try {
    const updatedPlaylist = await playlistService.update(playlist);
    updatedPlaylist.createdAt = updatedPlaylist._id.getTimestamp();
    res.json(updatedPlaylist);
  } catch (err) {
    loggerService.error(err);
    res.status(500).send({ error: err });
  }
}

export async function addPlaylist(req, res) {
  const { loggedinUser, body: playlistData } = req;
  try {
    const createdBy = loggedinUser || (await userService.getDefaultUser());
    const createdByMiniUser = userService.mapUserToMiniUser(createdBy, false);
    const playlist = {
      title: playlistData.title,
      description: playlistData.description,
      thumbnail: playlistData.thumbnail,
      createdBy: createdByMiniUser,
      songs: playlistData.songs || [],
    };
    await playlistService.add(playlist);
    res.json(playlist);
  } catch (err) {
    loggerService.error(err);
    res.status(400).send({ error: err });
  }
}

export async function removePlaylist(req, res) {
  const { playlistId } = req.params;
  try {
    const deleteSucceeded = await playlistService.remove(playlistId);
    if (deleteSucceeded) res.status(204).send();
    else res.status(404).send({ error: 'Resource not found' });
  } catch (err) {
    res.status(500).send({ error: err });
  }
}
