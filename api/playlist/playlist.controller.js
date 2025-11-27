import { loggerService } from '../../services/logger.service.js';
import { playlistService } from './playlist.service.js';

export async function getPlaylists(req, res) {
  try {
    const playlists = await playlistService.query();
    res.status(200).send(playlists);
  } catch (err) {
    loggerService.error(err);
    res.status(500).send({ error: err });
  }
}

export async function getPlaylist(req, res) {
  const { playlistId } = req.params;
  try {
    const playlist = await playlistService.getById(playlistId);
    if (!playlist) {
      res.status(404).send({ error: 'Resource does not exist' });
    } else res.status(200).send(playlist);
  } catch (err) {
    loggerService.error(err);
    res.status(500).send({ error: err });
  }
}

export async function updatePlaylist(req, res) {
  
  const playlist = {
    name: req.body.name,
    description: req.body.description,
    thumbnail: req.body.thumbnail,
    createdAt: req.body.createdAt,
    createdBy: req.body.createdBy,
    songs: req.body.songs,
  };
}

export async function addPlaylist(req, res) {
  const playlist = {
    name: req.body.name,
    description: req.body.description,
    thumbnail: req.body.thumbnail,
    createdAt: req.body.createdAt,
    createdBy: req.body.createdBy,
    songs: req.body.songs,
  };
  try {
    await playlistService.add(playlist);
    res.status(200).send(playlist);
  } catch (err) {
    loggerService.error(err);
    res.status(500).send({ error: err });
  }
}

export async function removePlaylist(req, res) {
  const { playlistId } = req.params;
  try {
    const succeeded = await playlistService.remove(playlistId);
    if (succeeded) res.status(204).send();
    else res.status(404).send({ error: 'Resource does not exist' });
  } catch (err) {
    loggerService.error(err);
    res.status(500).send({ error: err });
  }
}
