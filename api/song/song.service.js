import { dbService } from '../../services/db.service.js';
import { ObjectId } from 'mongodb';

export const songService = { query, getById, songExists, remove, add, update };

async function query(filterBy = {}) {
  try {
    const collection = await dbService.getCollection('song');
    const songs = await collection.find().toArray();
    return songs;
  } catch (err) {
    throw err;
  }
}

async function getById(songId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(songId) };
    const collection = await dbService.getCollection('song');
    const song = await collection.findOne(criteria);
    return song;
  } catch (err) {
    throw err;
  }
}

async function songExists(songId) {
  try {
    const song = getById(songId);
    if (!song) return false;
    return true;
  } catch (err) {
    return false;
  }
}

async function remove(songId) {
  try {
    const criteria = {
      _id: ObjectId.createFromHexString(songId),
    };
    const collection = await dbService.getCollection('song');
    const res = await collection.deleteOne(criteria);
    if (res.deletedCount === 0) return false; // nothing was deleted
    return true;
  } catch (err) {
    throw err;
  }
}

async function add(song) {
  try {
    const collection = await dbService.getCollection('song');
    await collection.insertOne(song);
    return song;
  } catch (err) {
    throw err;
  }
}

async function update(song) {
  const songToSave = { ...song };
  delete songToSave._id;
  if (!song._id) throw 'song id missing';
  try {
    const criteria = { _id: ObjectId.createFromHexString(song._id) };
    const collection = await dbService.getCollection('song');
    await collection.updateOne(criteria, { $set: songToSave });
    const saved = await getById(song._id);
    return saved;
  } catch (err) {
    throw err;
  }
}
