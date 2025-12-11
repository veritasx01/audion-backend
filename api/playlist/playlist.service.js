import { ObjectId } from 'mongodb';
import { utilService } from '../../services/util.service.js';
import { loggerService } from '../../services/logger.service.js';
import { dbService, dbCollections } from '../../services/db.service.js';

export const playlistService = {
  query,
  getById,
  playlistExists,
  remove,
  add,
  update,
  addSongToPlaylist,
  removeSongFromPlaylist,
};

const PAGE_SIZE = 50;

async function query(filterBy = {}, sortBy, sortDir) {
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
