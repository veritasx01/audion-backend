import { ObjectId } from 'mongodb';
import { utilService } from '../../services/util.service.js';
import { loggerService } from '../../services/logger.service.js';
import { dbService, dbCollections } from '../../services/db.service.js';
import { searchPlaylists } from '../../services/spotify.service.js';
import { enrichSongsWithYouTubeData } from '../../services/youtube.service.js';

export const playlistService = {
  query,
  getById,
  playlistExists,
  remove,
  add,
  addMany,
  update,
  addSongToPlaylist,
  removeSongFromPlaylist,
  getSongFullDetails,
};

const PAGE_SIZE = 50;

async function query(filterBy = {}, sortBy, sortDir) {
  // If searchString is provided, search Spotify playlists
  if (filterBy.searchString && !filterBy.userId && !filterBy.playlistIds) {
    const playlists = await querySpotifyPlaylists(filterBy.searchString);
    const savedPlaylists = await addMany(playlists);
    return savedPlaylists;
  }

  // Otherwise, query local database
  return await queryDB(filterBy, sortBy, sortDir);
}

async function querySpotifyPlaylists(query, limit = 20) {
  try {
    const spotifyPlaylists = await searchPlaylists(query, limit);
    return spotifyPlaylists;
  } catch (err) {
    loggerService.error('Failed to query Spotify playlists', err);
    throw err;
  }
}

async function queryDB(filterBy = {}, sortBy, sortDir) {
  try {
    const criteria = _buildFilterCriteria(filterBy);
    const sortObject = utilService.buildSortObject(sortBy, sortDir);
    const collection = await dbService.getCollection(dbCollections.PLAYLIST);
    var playlistCursor = await collection.find(criteria, sortObject);

    if (filterBy.pageIdx !== undefined) {
      playlistCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE);
    }

    const playlists = await playlistCursor.toArray();

    playlists.forEach(playlist => {
      playlist.createdAt = playlist._id.getTimestamp();
    });
    return playlists;
  } catch (err) {
    loggerService.error('Failed to query playlists', err);
    throw err;
  }
}

async function getById(playlistId) {
  try {
    const criteria = {
      _id:
        typeof playlistId === 'string'
          ? ObjectId.createFromHexString(playlistId)
          : playlistId,
    };
    const collection = await dbService.getCollection(dbCollections.PLAYLIST);
    const playlist = await collection.findOne(criteria);
    if (!playlist) return null;
    playlist.createdAt = playlist._id.getTimestamp();
    return playlist;
  } catch (err) {
    loggerService.error('Failed to Get Playlist by ID', err);
    throw err;
  }
}

async function playlistExists(playlistId) {
  try {
    const playlist = await getById(playlistId);
    if (!playlist) return false;
    return true;
  } catch (err) {
    loggerService.error(
      `Failed to check if playlist ${playlistId} exists`,
      err
    );
    throw err;
  }
}

async function remove(playlistId) {
  try {
    const criteria = {
      _id:
        typeof playlistId === 'string'
          ? ObjectId.createFromHexString(playlistId)
          : playlistId,
    };
    const collection = await dbService.getCollection(dbCollections.PLAYLIST);
    const res = await collection.deleteOne(criteria);
    if (res.deletedCount === 0) return false;
    return true;
  } catch (err) {
    loggerService.error(`Failed to remove playlist ${playlistId}`, err);
    throw err;
  }
}

async function add(playlist) {
  try {
    const collection = await dbService.getCollection(dbCollections.PLAYLIST);
    const result = await collection.insertOne(playlist);

    // Return the playlist with the generated _id and createdAt
    const insertedPlaylist = {
      ...playlist,
      _id: result.insertedId,
      createdAt: result.insertedId.getTimestamp(),
    };

    return insertedPlaylist;
  } catch (err) {
    loggerService.error(`Failed to add playlist`, err);
    throw err;
  }
}

async function addMany(playlists) {
  try {
    if (!Array.isArray(playlists) || playlists.length === 0) {
      throw new Error('Playlists must be a non-empty array');
    }

    const collection = await dbService.getCollection(dbCollections.PLAYLIST);
    const result = await collection.insertMany(playlists, { ordered: false });

    // Return the playlists with their generated _ids and createdAt
    const insertedPlaylists = playlists.map((playlist, index) => {
      const insertedId = result.insertedIds[index];
      return {
        ...playlist,
        _id: insertedId,
        createdAt: insertedId.getTimestamp(),
      };
    });

    loggerService.debug(
      `Successfully added ${insertedPlaylists.length} playlists to DB`
    );
    return insertedPlaylists;
  } catch (err) {
    loggerService.error(`Failed to add ${playlists?.length} playlists`, err);
    throw err;
  }
}

async function update(playlist) {
  const playlistToSave = { ...playlist };
  delete playlistToSave._id;
  if (!playlist._id) throw 'Playlist ID missing';
  try {
    const criteria = { _id: ObjectId.createFromHexString(playlist._id) };
    const collection = await dbService.getCollection(dbCollections.PLAYLIST);

    const updateResult = await collection.updateOne(criteria, {
      $set: playlistToSave,
    });

    if (updateResult.acknowledged !== true || updateResult.matchedCount === 0) {
      throw `Failed to update playlist ${playlist._id}`;
    }

    const modifiedPlaylist = await getById(playlist._id);
    modifiedPlaylist.createdAt = modifiedPlaylist._id.getTimestamp();

    return modifiedPlaylist;
  } catch (err) {
    loggerService.error('Failed to update playlist', err);
    throw err;
  }
}

async function addSongToPlaylist(playlistId, song) {
  try {
    const collection = await dbService.getCollection(dbCollections.PLAYLIST);
    const updateResult = await collection.updateOne(
      { _id: ObjectId.createFromHexString(playlistId) },
      { $push: { songs: song } }
    );
    if (
      updateResult.acknowledged !== true ||
      updateResult.modifiedCount === 0
    ) {
      throw `Failed to add song ${song?._id} to playlist ${playlistId}`;
    }
    return updateResult.acknowledged;
  } catch (err) {
    loggerService.error(
      `Failed to add song ${song?._id} to playlist ${playlistId}`,
      err
    );
    throw err;
  }
}

async function removeSongFromPlaylist(playlistId, songId) {
  try {
    const collection = await dbService.getCollection(dbCollections.PLAYLIST);
    const updateResult = await collection.updateOne(
      { _id: ObjectId.createFromHexString(playlistId) },
      { $pull: { songs: { _id: songId } } }
    );
    if (
      updateResult.acknowledged !== true ||
      updateResult.modifiedCount === 0
    ) {
      throw `Failed to remove song ${songId} from playlist ${playlistId}`;
    }
    return updateResult.acknowledged;
  } catch (err) {
    loggerService.error(
      `Failed to remove song ${songId} from playlist ${playlistId}`,
      err
    );
    throw err;
  }
}

async function getSongFullDetails(playlistId, songId) {
  try {
    const playlist = await getById(playlistId);

    const song = playlist.songs.find(song => song._id === songId);
    if (!song) throw `Song ${songId} not found in playlist ${playlistId}`;

    return song.url && song.duration
      ? song
      : await enrichSongWithYouTubeData(playlist, song);
  } catch (err) {
    loggerService.error(
      `Failed to get full details for song ${songId} in playlist ${playlistId}`,
      err
    );
    throw err;
  }
}

async function enrichSongWithYouTubeData(playlist, song) {
  const playlistId = playlist._id;
  const songId = song._id;
  try {
    const collection = await dbService.getCollection(dbCollections.PLAYLIST);
    loggerService.debug(
      `Enriching song ${songId} in playlist ${playlistId} with YouTube data. Current state: ${JSON.stringify(
        song
      )}`
    );
    const enrichedSongs = await enrichSongsWithYouTubeData([song]);
    const enrichedSong = enrichedSongs[0];
    if (!enrichedSong) {
      throw `YouTube enrichment returned no data for song ${songId} in playlist ${playlistId}`;
    }
    loggerService.debug(
      `Enriched song ${songId} in playlist ${playlistId} with YouTube data: ${JSON.stringify(
        enrichedSong
      )}`
    );
    // Update the song in the playlist
    const updateResult = await collection.updateOne(
      {
        _id:
          typeof playlist._id === 'string'
            ? ObjectId.createFromHexString(playlist._id)
            : playlist._id,
        'songs._id': song._id,
      },
      {
        $set: {
          'songs.$.youtubeVideoId': enrichedSong.youtubeVideoId,
          'songs.$.url': enrichedSong.url,
          'songs.$.duration': enrichedSong.duration,
        },
      }
    );
    if (
      updateResult.acknowledged !== true ||
      updateResult.modifiedCount === 0
    ) {
      throw `Failed to update song ${songId} in playlist ${playlistId} with YouTube data`;
    }
    loggerService.debug(
      `Successfully updated song ${songId} in playlist ${playlistId} with YouTube data`
    );
    return enrichedSong;
  } catch (err) {
    loggerService.error(
      `Failed to enrich song ${songId} in playlist ${playlistId} with YouTube data`,
      err
    );
    throw err;
  }
}

function _buildFilterCriteria(filterBy) {
  const criteria = {};

  // filter for playlists created by a specific user
  if (filterBy?.userId) {
    criteria._createdBy = filterBy.userId;
  }

  // filter for liked songs playlist
  if (filterBy?.isLikedSongs !== undefined) {
    criteria.isLikedSongs = filterBy.isLikedSongs;
  }

  if (
    filterBy?.playlistIds &&
    Array.isArray(filterBy.playlistIds) &&
    filterBy.playlistIds.length > 0
  ) {
    // Filter by specific playlist IDs (from user library)
    const playlistObjectIds = filterBy.playlistIds.map(id =>
      typeof id === 'string' ? ObjectId.createFromHexString(id) : id
    );
    criteria._id = { $in: playlistObjectIds };
  }

  // Free text search across songs in playlists
  if (filterBy?.searchString) {
    const searchRegex = { $regex: filterBy.searchString, $options: 'i' };
    criteria.$or = [
      { title: searchRegex }, // Search in playlist title
      { description: searchRegex }, // Search in playlist description
      { 'songs.title': searchRegex }, // Search in song titles
      { 'songs.artist': searchRegex }, // Search in song artists
      { 'songs.albumName': searchRegex }, // Search in song album names
    ];
  }

  // Filter by genre - playlist must have at least one song with the genre
  if (filterBy?.genre) {
    criteria['songs.genres'] = { $in: [filterBy.genre.toLowerCase()] };
  }

  return criteria;
}
