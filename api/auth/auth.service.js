import bcrypt from 'bcrypt'; // for hashing passwords
import jwt from 'jsonwebtoken'; // for generating and verifying JWT tokens

import { userService } from '../user/user.service.js';
import { loggerService } from '../../services/logger.service.js';

// Export error constants separately for better organization
export const AUTH_ERRORS = {
  INVALID_USERNAME: 'Unkown username',
  INVALID_CREDENTIALS: 'Invalid username or password',
  MISSING_SIGNUP_INFO: 'Missing required signup information',
  USERNAME_IN_USE: 'Username already taken',
  EMAIL_IN_USE: 'Email already in use',
};

export const authService = {
  generateToken,
  validateToken,
  login,
  signup,
};

function generateToken(user) {
  // Set token expiration time (e.g., 1 hour)
  const expiresIn = '1h';

  // Create the JWT token payload
  const payload = {
    _id: user._id,
    username: user.username,
    fullname: user.fullname,
    isAdmin: user.isAdmin,
  };

  // Sign the token with a secret key
  const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: expiresIn,
  });

  return jwtToken;
}

function validateToken(token) {
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    return decodedToken;
  } catch (err) {
    loggerService.error('auth.service: Invalid JWT token', err);
  }
  return null;
}

async function login(username, password) {
  var user = await userService.getByUsername(username);
  if (!user) throw AUTH_ERRORS.INVALID_USERNAME;

  // hash the given password and compare it with the stored hashed password
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw AUTH_ERRORS.INVALID_CREDENTIALS;

  const miniUser = {
    _id: user._id,
    username: user.username,
    fullname: user.fullname,
    isAdmin: user.isAdmin,
    imgUrl: user.imgUrl,
    // playlist: user.playlists TBD for library feature
  };
  return miniUser;
}

async function signup({
  username,
  password,
  fullname,
  email,
  imgUrl,
  isAdmin,
}) {
  const saltRounds = 10;

  loggerService.debug(
    `auth.service - signup with username: ${username}, fullname: ${fullname}`
  );
  if (!username || !password || !fullname)
    throw AUTH_ERRORS.MISSING_SIGNUP_INFO;

  const userExists = await userService.getByUsername(username);
  if (userExists) throw AUTH_ERRORS.USERNAME_IN_USE;

  const emailExists = email && (await userService.getByEmail(email));
  if (emailExists) throw AUTH_ERRORS.EMAIL_IN_USE;

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return userService.add({
    username,
    password: hashedPassword,
    fullname,
    email,
    imgUrl,
    isAdmin,
  });
}
