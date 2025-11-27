import { dbService } from '../../services/db.service.js';
import { ObjectId } from 'mongodb';

export const playlistService = { query, getById, remove, add, update };

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
  if (!playlist._id) throw 'message id missing';
  try {
    const criteria = { _id: ObjectId.createFromHexString(playlist._id) };
    const collection = await dbService.getCollection('playlist');
    delete playlist._id;
    const result = await collection.updateOne(criteria, { $set: playlistToSave });
    console.log('updateOne result:', result);

    return playlist;
  } catch (err) {
    throw err;
  }
}
