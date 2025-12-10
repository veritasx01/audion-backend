import { dbService } from '../../services/db.service.js';
import { loggerService } from '../../services/logger.service.js';
import { ObjectId } from 'mongodb';

export const songService = { query, getById, songExists, remove, add, update };

const PAGE_SIZE = 50;

async function query(filterBy = {}, sortBy, sortDir) {
  console.log('✸ → filterBy:', filterBy);
  try {
    const criteria = _buildFilterCriteria(filterBy);
    const sort = _buildSort(sortBy, sortDir);

    const collection = await dbService.getCollection('song');
    var songCursor = await collection.find(criteria, { sort });

    if (filterBy.pageIdx !== undefined) {
      songCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE);
    }

    const songs = await songCursor.toArray();
    return songs;
  } catch (err) {
    loggerService.error('Failed to query songs', err);
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
    loggerService.error('Failed to get song by id', err);
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
    loggerService.error('Failed to remove song', err);
    throw err;
  }
}

async function add(song) {
  try {
    const collection = await dbService.getCollection('song');
    await collection.insertOne(song);
    return song;
  } catch (err) {
    loggerService.error('Failed to add song', err);
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
    loggerService.error('Failed to update song', err);
    throw err;
  }
}

function _buildFilterCriteria(filterBy) {
  const criteria = {};

  // Add artist filter if specified (this will be ANDed with other criteria)
  if (filterBy.artist) {
    criteria.artist = { $regex: filterBy.artist, $options: 'i' };
  }

  // Add free text search functionality
  if (filterBy.searchString) {
    const searchRegex = { $regex: filterBy.searchString, $options: 'i' };

    // When both artist and searchString are present, they are ANDed together
    // The searchString searches across title, artist, and album
    criteria.$or = [
      { title: searchRegex },
      { artist: searchRegex },
      { albumName: searchRegex },
    ];
  }

  return criteria;
}

function _buildSort(sortBy, sortDir) {
  if (!sortBy) return {};
  return { [sortBy]: sortDir };
}
