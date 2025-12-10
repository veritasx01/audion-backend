import bcrypt from 'bcrypt'; // for hashing passwords
import jwt from 'jsonwebtoken'; // for generating and verifying JWT tokens

import { userService } from '../user/user.service.js';
import { loggerService } from '../../services/logger.service.js';

// Export error constants separately for better organization
export const AuthErrors = {
  INVALID_USERNAME: 'Invalid username',
  INVALID_CREDENTIALS: 'Invalid username or password',
  MISSING_SIGNUP_INFO: 'Missing required signup information',
  USERNAME_IN_USE: 'Username already taken',
  EMAIL_IN_USE: 'Email already in use',
  USER_IS_NOT_AUTHENTICATED: 'User is not authenticated',
  ACCESS_FORBIDDEN: 'User does not have permission to perform this action',
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
    fullName: user.fullName,
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
  if (!user) throw AuthErrors.INVALID_USERNAME;

  // hash the given password and compare it with the stored hashed password
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw AuthErrors.INVALID_CREDENTIALS;

  delete user.password;
  user._id = user._id.toString();
  /* 
  const miniUser = userService.mapUserToMiniUser(user);
  miniUser.library = {
    playlists: await userService.getUserPlaylists(user._id),
  };
  */

  return user;
}

async function signup({
  username,
  password,
  fullName,
  email,
  profileImg,
  isAdmin,
}) {
  const saltRounds = 10;

  loggerService.debug(
    `auth.service - signup with username: ${username}, fullName: ${fullName}`
  );
  if (!username || !password || !fullName) throw AuthErrors.MISSING_SIGNUP_INFO;

  const userExists = await userService.getByUsername(username);
  if (userExists) throw AuthErrors.USERNAME_IN_USE;

  const emailExists = email && (await userService.getByEmail(email));
  if (emailExists) throw AuthErrors.EMAIL_IN_USE;

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return userService.add({
    username,
    password: hashedPassword,
    fullName,
    email,
    profileImg,
    isAdmin,
  });
}
