import { dbService, dbCollections } from '../../services/db.service.js';
import { utilService } from '../../services/util.service.js';
import { logger } from '../../services/logger.service.js';
import { ObjectId } from 'mongodb';

export const userService = {
  add, // Create (Signup)
  getById, // Read (Profile page)
  update, // Update (Edit profile)
  remove, // Delete (remove user)
  query, // List (of users)
  getByUsername, // Used for Login
  getByEmail, // Used for signup unique email validation
  getUserPlaylists, // Get playlists for a user
  getUserPlaylistsByUserId, // Get playlists for a user by his userId
};

async function query(filterBy = {}) {
  const criteria = _buildCriteria(filterBy);
  try {
    const collection = await dbService.getCollection(dbCollections.USER);
    var users = await collection.find(criteria).toArray();
    users = users.map(user => {
      delete user.password; // remove password before returning the user object
      user.createdAt = user._id.getTimestamp(); // enrich user object with createdAt timestamp
      return user;
    });
    return users;
  } catch (err) {
    logger.error('cannot find users', err);
    throw err;
  }
}

async function getById(userId) {
  try {
    var criteria = { _id: ObjectId.createFromHexString(userId) };

    const collection = await dbService.getCollection(dbCollections.USER);
    const user = await collection.findOne(criteria);
    delete user.password; // remove password before returning the user
    user.createdAt = user._id.getTimestamp(); // enrich user object with createdAt timestamp
    user.playlists = await getUserPlaylists(user); // enrich user object with his library playlist objects

    return user;
  } catch (err) {
    logger.error(`while finding user by id: ${userId}`, err);
    throw err;
  }
}

async function getByUsername(username) {
  try {
    const collection = await dbService.getCollection(dbCollections.USER);
    const user = await collection.findOne({ username: username.toLowerCase() });
    return user;
  } catch (err) {
    logger.error(`while finding user by username: ${username}`, err);
    throw err;
  }
}

async function getByEmail(email) {
  try {
    const collection = await dbService.getCollection(dbCollections.USER);
    const user = await collection.findOne({ email: email.toLowerCase() });
    return user;
  } catch (err) {
    logger.error(`Failed querying a user by email: ${email}`, err);
    throw err;
  }
}

async function remove(userId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(userId) };

    const collection = await dbService.getCollection(dbCollections.USER);
    await collection.deleteOne(criteria);
  } catch (err) {
    logger.error(`cannot remove user ${userId}`, err);
    throw err;
  }
}

async function update(user) {
  try {
    const userToSave = utilService.removeEmptyObjectFields({
      _id: ObjectId.createFromHexString(user._id), // needed for the returnd obj
      fullname: user.fullname,
      email: user.email,
      imgUrl: user.imgUrl,
    });
    const collection = await dbService.getCollection(dbCollections.USER);
    await collection.updateOne({ _id: userToSave._id }, { $set: userToSave });
    return userToSave;
  } catch (err) {
    logger.error(`cannot update user ${user._id}`, err);
    throw err;
  }
}

async function add(user) {
  try {
    const userToAdd = {
      username: user.username.toLowerCase(),
      password: user.password,
      fullname: user.fullname,
      email: user.email.toLowerCase(),
      imgUrl: user.imgUrl,
      isAdmin: user.isAdmin,
      playlists: [], // TBD: create & add default "liked songs" playlist
    };
    const collection = await dbService.getCollection(dbCollections.USER);
    await collection.insertOne(userToAdd);
    return userToAdd;
  } catch (err) {
    logger.error('cannot add user', err);
    throw err;
  }
}

// fetch playlist objects libary for a given userId
async function getUserPlaylistsByUserId(userId) {
  try {
    const user = await getById(userId);
    getUserPlaylists(user);
  } catch (err) {
    logger.error(`Error fetching user playlists: ${err.message}`, err);
    throw err;
  }
}

// fetch playlist objects for a given user based on his libray list of playlist IDs
async function getUserPlaylists(user) {
  try {
    // Check if user has playlist IDs
    if (
      !user.playlists ||
      !Array.isArray(user.playlists) ||
      user.playlists.length === 0
    ) {
      return [];
    }

    // Convert playlist IDs to ObjectId format
    const playlistIds = user.playlists.map(id =>
      typeof id === 'string' ? ObjectId.createFromHexString(id) : id
    );

    const playlistCollection = await dbService.getCollection(
      dbCollections.PLAYLIST
    );
    const playlists = await playlistCollection
      .find({
        _id: { $in: playlistIds },
      })
      .toArray();

    return playlists;
  } catch (err) {
    logger.error(`Error fetching user playlists: ${err.message}`, err);
    throw err;
  }
}

function _buildCriteria(filterBy) {
  const criteria = {};
  if (filterBy.name) {
    const nameCriteria = { $regex: filterBy.name, $options: 'i' };
    criteria.$or = [{ username: nameCriteria }, { fullname: nameCriteria }];
  }
  if (filterBy.email) {
    criteria.email = filterBy.email;
  }
  return criteria;
}
