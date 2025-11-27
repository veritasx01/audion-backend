import { authService, AuthErrors } from './auth.service.js';
import { loggerService } from './../../services/logger.service.js';

const cookieOptions = {
  httpOnly: true, // for preventing XSS attacks
  sameSite: 'None',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 3600000, // 1 hour
};

export async function login(req, res) {
  const { username, password } = req.body;

  try {
    const user = await authService.login(username, password);
    loggerService.info('User login: ', user);

    const loginToken = authService.generateToken(user);
    res.cookie('loginToken', loginToken, cookieOptions);

    authService.validateToken(loginToken);

    res.json(user);
  } catch (err) {
    loggerService.error('Failed to Login', err);

    // Handle specific error messages
    if (
      err === AuthErrors.INVALID_CREDENTIALS ||
      err === AuthErrors.INVALID_USERNAME
    ) {
      return res.status(401).send({ err: 'Invalid username or password' });
    }

    // Generic error for unexpected issues
    res.status(500).send({ err: 'Login failed. Please try again.' });
  }
}

export async function signup(req, res) {
  try {
    const credentials = req.body;

    const account = await authService.signup(credentials);
    loggerService.debug(
      `auth.route - new account created: ` + JSON.stringify(account)
    );

    const user = await authService.login(
      credentials.username,
      credentials.password
    );
    loggerService.info('User signup:', user);

    const loginToken = authService.generateToken(user);
    res.cookie('loginToken', loginToken, cookieOptions);
    res.status(201).json(user);
  } catch (err) {
    loggerService.error('Failed to signup ' + err);

    // Handle specific error messages
    if (err === AuthErrors.MISSING_SIGNUP_INFO) {
      return res
        .status(400)
        .send({ err: 'Please fill in all required fields' });
    }
    if (err === AuthErrors.USERNAME_IN_USE || err === AuthErrors.EMAIL_IN_USE) {
      return res.status(409).send({
        err: 'Account with these credentials already exists. Please try a different username/email.',
      });
    }

    // Generic error for unexpected issues
    res.status(500).send({ err: 'Signup failed. Please try again.' });
  }
}

export async function logout(req, res) {
  try {
    res.clearCookie('loginToken');
    res.send({ msg: 'Logged out successfully' });
  } catch (err) {
    loggerService.error('Failed to logout ' + err);
    res.status(400).send({ err: 'Failed to logout' });
  }
}
