import { authService } from './auth.service.js';
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
    res.status(401).send({ err: 'Failed to Login' });
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
    res.json(user);
  } catch (err) {
    loggerService.error('Failed to signup ' + err);
    res.status(400).send({ err: 'Failed to signup' });
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
