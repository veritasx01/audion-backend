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
    if (!song) {
      res.status(404).send({error: "Resource does not exist"})
    } else res.status(200).send(song);
  } catch (err) {
    res.status(500).send({ error: err });
  }
}

export async function updateSong(req, res) {
  const { songId } = req.params;
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(200).send();
  }
  if (!songService.songExists(songId)) {
    return res.status(404).send();
  }
  let song = {
    _id: songId,
    title: req.body.title,
    artist: req.body.artist,
    duration: req.body.duration,
    albumName: req.body.albumName,
    thumbnail: req.body.thumbnail,
    releasedAt: req.body.releasedAt,
    url: req.body.url,
    genres: req.body.genres,
    credits: req.body.credits,
  };
  // only update fields which have content
  song = Object.fromEntries(
    Object.entries(song).filter(
      ([key, value]) => value !== null && value !== undefined
    )
  );
  try {
    await songService.update(song);
    res.status(200).send(song);
  } catch (err) {
    res.status(500).send({ error: err });
  }
}

export async function addSong(req, res) {
  const song = {
    title: req.body.title,
    artist: req.body.artist,
    duration: req.body.duration,
    albumName: req.body.albumName,
    thumbnail: req.body.thumbnail,
    releasedAt: req.body.releasedAt,
    url: req.body.url,
    genres: req.body.genres,
    credits: req.body.credits,
  };
  try {
    await songService.add(song);
    res.status(200).send(song);
  } catch (err) {
    res.status(500).send({ error: err });
  }
}

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
