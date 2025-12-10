import { MongoClient } from 'mongodb';
import { loggerService } from '../services/logger.service.js';

import { config } from '../config/db/index.js';
// console.log('config:', config)

export const dbService = { getCollection };
export const dbCollections = {
  USER: 'user',
  SONG: 'song',
  PLAYLIST: 'playlist',
};

var dbConn = null;

_populateDB();

async function getCollection(collectionName) {
  try {
    const db = await _connect();
    const collection = await db.collection(collectionName);
    return collection;
  } catch (err) {
    loggerService.error('Failed to get Mongo collection', err);
    throw err;
  }
}

async function _connect() {
  if (dbConn) return dbConn;

  try {
    const client = await MongoClient.connect(config.dbURL);
    return (dbConn = client.db(config.dbName));
  } catch (err) {
    loggerService.error('Cannot Connect to DB', err);

    throw err;
  }
}

async function _populateDB() {
  try {
    // populate songs
    const songCollection = await getCollection(dbCollections.SONG);
    const count = await songCollection.countDocuments();
    if (count === 0) {
      const songsData = await import('../data/songs.js');
      await songCollection.insertMany(songsData.songs);
      loggerService.info('Database populated with initial songs data.');
    }

    // populate playlists
    const playlistCollection = await getCollection(dbCollections.PLAYLIST);
    const playlistCount = await playlistCollection.countDocuments();
    if (playlistCount === 0) {
      const playlistsData = await import('../data/playlists.js');
      await playlistCollection.insertMany(playlistsData.playlists);
      loggerService.info('Database populated with initial playlists data.');
    }

    // populate users
    const userCollection = await getCollection(dbCollections.USER);
    const userCount = await userCollection.countDocuments();
    if (userCount === 0) {
      const usersData = await import('../data/users.js');
      await userCollection.insertMany(usersData.users);
      loggerService.info('Database populated with initial users data.');
    }
  } catch (err) {
    loggerService.error('Failed to populate DB', err);
    throw err;
  }
}
