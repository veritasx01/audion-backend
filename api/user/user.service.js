import { ObjectId } from 'mongodb';
import { AuthErrors } from '../auth/auth.service.js';
import { utilService } from '../../services/util.service.js';
import { loggerService } from '../../services/logger.service.js';
import { playlistService } from '../playlist/playlist.service.js';
import { dbService, dbCollections } from '../../services/db.service.js';
import { asyncLocalStorage } from '../../services/als.service.js';

export const userService = {
  add, // Create (Signup)
  getById, // Read (Profile page)
  update, // Update (Edit profile)
  remove, // Delete (remove user)
  query, // List (of users)
  getByUsername, // Used for Login
  getByEmail, // Used for validating email is unique during signup and updates
  getUserPlaylists, // Get playlists for a user
  getDefaultUser, // Get the default user: temporary until auth is fully implemented
  mapUserToMiniUser, // return a mini user object with only the essential fields
};

export const DEFAULT_USER_USERNAME = 'defaultuser';

async function query(filterBy = {}) {
  const criteria = _buildCriteria(filterBy);
  try {
    const collection = await dbService.getCollection(dbCollections.USER);
    var users = await collection.find(criteria).toArray();
    users = users.map(user => mapUserToMiniUser(user));
    return users;
  } catch (err) {
    loggerService.error('cannot find users', err);
    throw err;
  }
}

async function getById(userId) {
  try {
    var criteria = { _id: ObjectId.createFromHexString(userId) };

    const collection = await dbService.getCollection(dbCollections.USER);
    const user = await collection.findOne(criteria);
    const miniUser = mapUserToMiniUser(user);
    miniUser.library = { playlists: await getUserPlaylists(user._id) };
    return miniUser;
  } catch (err) {
    loggerService.error(`while finding user by id: ${userId}`, err);
    throw err;
  }
}

async function getByUsername(username) {
  try {
    const collection = await dbService.getCollection(dbCollections.USER);
    const user = await collection.findOne({ username: username.toLowerCase() });
    return user;
  } catch (err) {
    loggerService.error(`while finding user by username: ${username}`, err);
    throw err;
  }
}

async function getByEmail(email, userIdToExclude = null) {
  try {
    const collection = await dbService.getCollection(dbCollections.USER);
    const criteria = { email: email.toLowerCase() };
    if (userIdToExclude) {
      criteria._id = { $ne: ObjectId.createFromHexString(userIdToExclude) };
    }
    const user = await collection.findOne(criteria);
    const miniUser = mapUserToMiniUser(user);
    return miniUser;
  } catch (err) {
    loggerService.error(`Failed querying a user by email: ${email}`, err);
    throw err;
  }
}

async function remove(userId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(userId) };

    const collection = await dbService.getCollection(dbCollections.USER);

    const result = await collection.deleteOne(criteria);
    if (result.deletedCount === 0) return false;
    return true;
  } catch (err) {
    loggerService.error(`cannot remove user ${userId}`, err);
    throw err;
  }
}

async function update(user) {
  const { loggedinUser } = asyncLocalStorage.getStore();
  const { _id: loggedInUserId, isAdmin } = loggedinUser;
  try {
    // validate logged in user is authorized to update this users profile
    if (!isAdmin && user._id !== loggedInUserId) {
      throw new Error(AuthErrors.ACCESS_FORBIDDEN);
    }

    const userToSave = utilService.removeEmptyObjectFields({
      _id: ObjectId.createFromHexString(user._id), // needed for the returnd obj
      fullName: user.fullName,
      email: user.email.toLowerCase(),
      imgUrl: user.imgUrl,
    });

    // Check if email is already taken by another user
    if (userToSave.email) {
      const existingUserWithThisEmail = await getByEmail(
        userToSave.email,
        user._id
      );
      if (existingUserWithThisEmail) {
        throw new Error(AuthErrors.EMAIL_IN_USE);
      }
    }
    const collection = await dbService.getCollection(dbCollections.USER);
    const updateResult = await collection.updateOne(
      { _id: userToSave._id },
      { $set: userToSave }
    );
    if (updateResult.acknowledged !== true || updateResult.matchedCount === 0) {
      throw `Failed to update user ${user._id}`;
    } else {
      updatedUser = await getById(user._id);
      return updatedUser;
    }
  } catch (err) {
    loggerService.error(`cannot update user ${user._id}`, err);
    throw err;
  }
}

async function add(user) {
  try {
    const userToAdd = {
      username: user.username.toLowerCase(),
      password: user.password,
      fullName: user.fullName,
      email: user.email.toLowerCase(),
      profileImg: user.profileImg,
      // isAdmin: user.isAdmin, // TBD: only admin can create another admin
      library: { playlists: [] },
    };
    const collection = await dbService.getCollection(dbCollections.USER);
    const insertedUserId = await collection.insertOne(userToAdd);
    return userToAdd;
  } catch (err) {
    loggerService.error('cannot add user', err);
    throw err;
  }
}

// fetch playlist objects for a given user based on his libray list of playlist IDs
async function getUserPlaylists(userId) {
  try {
    const user = await getById(userId);

    // Check if user has playlist IDs
    if (
      !user?.library?.playlists ||
      !Array.isArray(user.library.playlists) ||
      user.library.playlists.length === 0
    ) {
      return [];
    }

    // Convert playlist IDs to ObjectId format
    const playlistIds = user.library.playlists.map(id =>
      typeof id === 'string' ? ObjectId.createFromHexString(id) : id
    );

    // fetch
    const userLibraryPlaylists = await playlistService.query({
      playlistIds: playlistIds,
    });

    return userLibraryPlaylists;
  } catch (err) {
    loggerService.error(`Error fetching user playlists: ${err.message}`, err);
    throw err;
  }
}

// fetch the default user (used temoprarily for actions that require a user context until auth is fully implemented)
async function getDefaultUser() {
  try {
    const defaultUser = await getByUsername(DEFAULT_USER_USERNAME);
    const miniDefaultUser = mapUserToMiniUser(defaultUser);
    miniDefaultUser.library = {
      playlists: await getUserPlaylists(defaultUser._id),
    };
    return miniDefaultUser;
  } catch (err) {
    loggerService.error('Error fetching default user', err);
    throw err;
  }
}

async function addPlaylistToUserLibrary(userId, playlistId) {
  try {
    const collection = await dbService.getCollection(dbCollections.USER);
    updateResult = await collection.updateOne(
      { _id: ObjectId.createFromHexString(userId) },
      { $addToSet: { 'library.playlists': playlistId } }
    );
    if (updateResult.acknowledged !== true || updateResult.matchedCount === 0) {
      throw `Failed to add playlist ${playlistId} to user ${userId} library`;
    } else {
      return await getById(userId);
    }
  } catch (err) {
    loggerService.error(
      `Failed to add playlist ${playlistId} to user ${userId} library`,
      err
    );
    throw err;
  }
}

async function removePlaylistFromUserLibrary(userId, playlistId) {
  try {
    const collection = await dbService.getCollection(dbCollections.USER);
    updateResult = await collection.updateOne(
      { _id: ObjectId.createFromHexString(userId) },
      { $pull: { 'library.playlists': playlistId } }
    );
    if (updateResult.acknowledged !== true || updateResult.matchedCount === 0) {
      throw `Failed to remove playlist ${playlistId} from user ${userId} library`;
    } else {
      return await getById(userId);
    }
  } catch (err) {
    loggerService.error(
      `Failed to remove playlist ${playlistId} from user ${userId} library`,
      err
    );
    throw err;
  }
}

function mapUserToMiniUser(user) {
  if (!user) return null;
  const miniUserKeys = [
    '_id',
    'username',
    'fullName',
    'email',
    'profileImg',
    'isAdmin',
  ];
  const miniUser = Object.fromEntries(
    Object.entries(user).filter(
      ([key, value]) => key && miniUserKeys.includes(key)
    )
  );

  miniUser.createdAt = user._id.getTimestamp();
  return miniUser;
}

function _buildCriteria(filterBy) {
  const criteria = {};
  if (filterBy.name) {
    const nameCriteria = { $regex: filterBy.name, $options: 'i' };
    criteria.$or = [{ username: nameCriteria }, { fullName: nameCriteria }];
  }
  if (filterBy.email) {
    criteria.email = filterBy.email;
  }
  return criteria;
}
