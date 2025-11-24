import { songService } from './song.service.js';

export async function getSongs(res, req) {
  try {
    const songs = await songService.query();
    res.status(200).send(songs);
  } catch (err) {
    res.status(500).send({ error: err });
  }
}

export async function getSong(res, req) {
  try {
    const song = await songService.getById();
    res.status(200).send(song);
  } catch (err) {
    res.status(500).send({ error: err });
  }
}

export async function updateSong(res, req) {}

export async function addSong(res, req) {}

export async function removeSong(res, req) {
  const { songId } = res.params;
  try {
    const succeeded = await songService.remove(songId);
    if (succeeded) res.status(204).send();
    else res.status(404).send({ error: 'Resource does not exist' });
  } catch (err) {
    res.status(500).send({ error: err });
  }
}
