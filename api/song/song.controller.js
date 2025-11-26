import { songService } from './song.service.js';

export async function getSongs(req, res) {
  try {
    const songs = await songService.query();
    res.status(200).send(songs);
  } catch (err) {
    res.status(500).send({ error: err });
  }
}

export async function getSong(req, res) {
  const { songId } = req.params;
  try {
    const song = await songService.getById(songId);
    res.status(200).send(song);
  } catch (err) {
    res.status(500).send({ error: err });
  }
}

export async function updateSong(req, res) {}

export async function addSong(req, res) {}

export async function removeSong(req, res) {
  const { songId } = req.params;
  try {
    const succeeded = await songService.remove(songId);
    if (succeeded) res.status(204).send();
    else res.status(404).send({ error: 'Resource does not exist' });
  } catch (err) {
    res.status(500).send({ error: err });
  }
}
