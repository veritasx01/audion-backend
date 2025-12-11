import { MongoClient, ObjectId } from 'mongodb';
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
    // populate users
    const userCollection = await getCollection(dbCollections.USER);
    const userCount = await userCollection.countDocuments();
    if (userCount === 0) {
      const usersData = await import('../data/users.js');
      await userCollection.insertMany(usersData.users);
      loggerService.info('Database populated with initial users data.');
    }

    // populate songs
    const songCollection = await getCollection(dbCollections.SONG);
    const count = await songCollection.countDocuments();
    if (count === 0) {
      const songsData = await import('../data/songs.js');
      await songCollection.insertMany(songsData.songs);
      loggerService.info('Database populated with initial songs data.');
    }

    const users = await userCollection.find().toArray();
    const songs = await songCollection.find().toArray();

    const playlistCollection = await getCollection(dbCollections.PLAYLIST);

    // Create a "Liked Songs" playlist for each user
    const likedPlaylistsCount = await playlistCollection.countDocuments({
      isLikedSongs: true,
    });
    if (likedPlaylistsCount === 0 && users.length > 0) {
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
          thumbnail:
            'data:image/jpeg;base64,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',
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

      // Generate genre-based playlists
      if (songs.length > 0 && users.length > 0) {
        // Extract unique genres
        const genres = new Set();
        songs.forEach(song => {
          if (song.genres && Array.isArray(song.genres)) {
            song.genres.forEach(genre => genres.add(genre.toLowerCase()));
          }
        });

        // Create playlists for each genre
        const playlists = [];
        for (const genre of genres) {
          const genreSongs = songs.filter(
            song =>
              song.genres && song.genres.some(g => g.toLowerCase() === genre)
          );
          const randomUser = users[Math.floor(Math.random() * users.length)];

          playlists.push({
            title: `${
              genre.charAt(0).toUpperCase() + genre.slice(1)
            } Essentials`,
            description: `A curated collection of the best ${genre} tracks`,
            createdBy: {
              _id: randomUser._id.toString(), // Convert to string
              username: randomUser.username,
              fullName: randomUser.fullName,
              email: randomUser.email,
              profileImg:
                randomUser.profileImg ||
                'https://randomuser.me/api/portraits/thumb/men/81.jpg',
            },
            songs: genreSongs.map(song => ({
              _id: song._id.toString(), // Convert to string
              title: song.title,
              artist: song.artist,
              duration: song.duration,
              albumName: song.albumName,
              thumbnail: song.thumbnail,
              releasedAt: song.releasedAt,
              genres: song.genres,
              url: song.url,
              addedAt: new Date(),
            })),
            thumbnail:
              genreSongs[0]?.thumbnail ||
              'https://img.youtube.com/vi/default/hqdefault.jpg',
          });
        }

        if (playlists.length > 0) {
          const insertResult = await playlistCollection.insertMany(playlists);
          const insertedPlaylistIds = Object.values(insertResult.insertedIds);

          // Update users' libraries with their assigned genre playlists
          for (let i = 0; i < playlists.length; i++) {
            const playlist = playlists[i];
            const playlistId = insertedPlaylistIds[i].toString(); // Convert to string
            const userId = ObjectId.createFromHexString(playlist.createdBy._id); // Convert back to ObjectId for query

            // Add this playlist ID to the user's library.playlists array
            await userCollection.updateOne(
              { _id: userId },
              { $addToSet: { 'library.playlists': playlistId } }
            );
          }

          loggerService.info(
            `Database populated with ${playlists.length} genre-based playlists and updated user libraries.`
          );
        }
      }

      loggerService.info(
        `Created ${likedPlaylists.length} "Liked Songs" playlists and updated user libraries.`
      );
    }
  } catch (err) {
    loggerService.error('Failed to populate DB', err);
    throw err;
  }
}
