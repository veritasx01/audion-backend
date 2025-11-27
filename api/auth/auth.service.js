import bcrypt from 'bcrypt'; // for hashing passwords
import jwt from 'jsonwebtoken'; // for generating and verifying JWT tokens

import { userService } from '../user/user.service.js';
import { loggerService } from '../../services/logger.service.js';

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
  if (!user) throw 'Unkown username';

  // hash the given password and compare it with the stored hashed password
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw 'Invalid username or password';

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
    throw 'Missing required signup information';

  const userExist = await userService.getByUsername(username);
  if (userExist) throw 'Username already taken';

  // TBD check that email is unique as well

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
