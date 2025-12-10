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
            _id: user._id,
            username: user.username,
            fullName: user.fullname,
            email: user.email,
            profileImg:
              user.imgUrl ||
              'https://randomuser.me/api/portraits/thumb/men/1.jpg',
          },
          createdAt: new Date(),
          songs: [], // Empty initially
          thumbnail: 'https://img.youtube.com/vi/default/hqdefault.jpg',
          isLikedSongs: true, // Special flag to identify liked songs playlists
        };

        likedPlaylists.push(likedPlaylist);
      }

      const insertResult = await playlistCollection.insertMany(likedPlaylists);
      const insertedPlaylists = Object.values(insertResult.insertedIds);

      // Update each user's library.playlists array with their liked playlist ID
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const playlistId = insertedPlaylists[i];

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
              _id: randomUser._id,
              username: randomUser.username,
              fullName: randomUser.fullname,
              email: randomUser.email,
              profileImg:
                randomUser.imgUrl ||
                'https://randomuser.me/api/portraits/thumb/men/81.jpg',
            },
            songs: genreSongs.map(song => ({
              _id: song._id,
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
            const playlistId = insertedPlaylistIds[i];
            const userId = playlist.createdBy._id;

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
