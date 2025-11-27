import { dbService } from '../../services/db.service.js';
import { ObjectId } from 'mongodb';

export const playlistService = {
  query,
  getById,
  playlistExists,
  remove,
  add,
  update,
};

async function query(filterBy = {}) {
  try {
    const collection = await dbService.getCollection('playlist');
    const playlists = await collection.find({}).toArray();
    return playlists;
  } catch (err) {
    throw err;
  }
}

async function getById(playlistId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(playlistId) };
    const collection = await dbService.getCollection('playlist');
    const playlist = await collection.findOne(criteria);
    return playlist;
  } catch (err) {
    throw err;
  }
}

async function playlistExists(playlistId) {
  try {
    const playlist = getById(playlistId);
    if (!playlist) return false;
    return true;
  } catch (err) {
    return false;
  }
}

async function remove(playlistId) {
  try {
    const criteria = {
      _id: ObjectId.createFromHexString(playlistId),
    };
    const collection = await dbService.getCollection('playlist');
    const res = await collection.deleteOne(criteria);
    if (res.deletedCount === 0) return false; // nothing was deleted
    return true;
  } catch (err) {
    throw err;
  }
}

async function add(playlist) {
  try {
    const collection = await dbService.getCollection('playlist');
    await collection.insertOne(playlist);
    return playlist;
  } catch (err) {
    throw err;
  }
}

async function update(playlist) {
  const playlistToSave = { ...playlist };
  delete playlistToSave._id;
  if (!playlist._id) throw 'playlist id missing';
  try {
    const criteria = { _id: ObjectId.createFromHexString(playlist._id) };
    const collection = await dbService.getCollection('playlist');

    await collection.updateOne(criteria, { $set: playlistToSave });
    const saved = await getById(playlist._id);

    return saved;
  } catch (err) {
    loggerService.error('Failed to update playlist', err);
    throw err;
  }
}
