import { MongoClient, ObjectId } from 'mongodb';
import { config } from '../config/db/index.js';
import { loggerService } from '../services/logger.service.js';
import { playlistService } from '../api/playlist/playlist.service.js';

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
    // populate users
    const userCollection = await getCollection(dbCollections.USER);
    const userCount = await userCollection.countDocuments();
    if (userCount === 0) {
      loggerService.info('No users found on DB. Populating initial data...');
      const usersData = await import('../data/users.js');
      const insertResult = await userCollection.insertMany(usersData.users);
      loggerService.info(
        `Database populated successfully with ${insertResult.insertedCount} users.`
      );
    }

    // populate songs
    const songCollection = await getCollection(dbCollections.SONG);
    const count = await songCollection.countDocuments();
    if (count === 0) {
      loggerService.info('No songs found on DB. Populating initial data...');
      const songsData = await import('../data/songs.js');
      const insertResult = await songCollection.insertMany(songsData.songs);
      loggerService.info(
        `Database populated successfully with ${insertResult.insertedCount} songs.`
      );
    }

    // populate playlists
    const users = await userCollection.find().toArray();
    const songs = await songCollection.find().toArray();

    const playlistCollection = await getCollection(dbCollections.PLAYLIST);

    // Create a "Liked Songs" playlist for each user
    const likedPlaylistsCount = await playlistCollection.countDocuments({
      isLikedSongs: true,
    });
    if (likedPlaylistsCount === 0 && users.length > 0) {
      loggerService.info(
        'No "Liked Songs" playlists found. Creating an empty playlist for each user...'
      );
      const likedPlaylists = [];
      const userUpdates = [];

      for (const user of users) {
        // Create "Liked Songs" playlist
        const likedPlaylist = {
          title: 'Liked Songs',
          description: 'Your collection of liked songs',
          createdBy: {
            _id: user._id.toString(), // Convert to string
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            profileImg:
              user.profileImg ||
              'https://randomuser.me/api/portraits/thumb/men/1.jpg',
          },
          createdAt: new Date(),
          songs: [], // Empty initially
          thumbnail: 'https://misc.scdn.co/liked-songs/liked-songs-300.jpg', // https://misc.scdn.co/liked-songs/liked-songs-300.jpg
          isLikedSongs: true, // Special flag to identify liked songs playlists
        };

        likedPlaylists.push(likedPlaylist);
      }

      const insertResult = await playlistCollection.insertMany(likedPlaylists);
      const insertedPlaylists = Object.values(insertResult.insertedIds);

      // Update each user's library.playlists array with their liked playlist ID (as string)
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const playlistId = insertedPlaylists[i].toString(); // Convert to string

        await userCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              'library.playlists': [playlistId],
            },
          }
        );
      }
      loggerService.info(
        `Created ${likedPlaylists.length} "Liked Songs" playlists and updated user libraries.`
      );
    }

    // Populate default playlists
    const regularPlaylistCount = await playlistCollection.countDocuments({
      isLikedSongs: { $ne: true },
    });
    if (regularPlaylistCount > 0) return;
    const defaultPlaylists = [];

    const data = await import('../data/playlists.json', {
      with: { type: 'json' },
    });
    defaultPlaylists.push(...(data.default || []));
    if (defaultPlaylists.length > 0) {
      loggerService.info(
        `Loading ${defaultPlaylists.length} playlists from default initial playlist data...`
      );
      try {
        const insertedPlaylists = await playlistService.addMany(
          defaultPlaylists
        );
        loggerService.info(
          `Successfully inserted ${insertedPlaylists.length} playlists.`
        );
      } catch (err) {
        loggerService.error('Error inserting default playlists:', err);
      }
    } else {
      loggerService.info('No default playlists to insert');
    }

    loggerService.info('Database population completed successfully.');
  } catch (err) {
    loggerService.error('Failed to populate DB', err);
    throw err;
  }
}
