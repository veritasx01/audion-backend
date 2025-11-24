import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const token = req.cookies.loginToken;

  if (!token) {
    return res.status(401).send({ error: 'Not logged in' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).send({ error: `Invalid token ${err}` });
  }
}

/*
export function requireAuth(req, res, next) {
  const { loggedinUser } = asyncLocalStorage.getStore();
  req.loggedinUser = loggedinUser;

  if (!loggedinUser) return res.status(401).send('Not Authenticated');
  next();
}
*/

export function requireAdmin(req, res, next) {
  const token = req.cookies.loginToken;
  const user = jwt.verify(token, process.env.JWT_SECRET);

  if (!user) return res.status(401).send('Not Authenticated');
  if (!user.isAdmin) {
    res.status(403).end('Not Authorized');
    return;
  }
  next();
}

export function getLoggedUser(req) {
  const loginToken = req.cookies?.loginToken;
  if (!loginToken) return {};
  return jwt.verify(loginToken, process.env.JWT_SECRET);
}
