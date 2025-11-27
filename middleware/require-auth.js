import { loggerService } from '../services/logger.service.js';
import { asyncLocalStorage } from '../services/als.service.js';
import { AuthErrors } from '../api/auth/auth.service.js';

export function requireAuth(req, res, next) {
  const { loggedinUser } = asyncLocalStorage.getStore();
  req.loggedinUser = loggedinUser;

  if (!loggedinUser)
    return res.status(401).send(AuthErrors.USER_IS_NOT_AUTHENTICATED);
  next();
}

export function requireAdmin(req, res, next) {
  const { loggedinUser } = asyncLocalStorage.getStore();

  if (!loggedinUser)
    return res.status(401).send(AuthErrors.USER_IS_NOT_AUTHENTICATED);
  if (!loggedinUser.isAdmin) {
    loggerService.warn(
      loggedinUser.fullname + ' attempted to perform admin action'
    );
    res.status(403).end(AuthErrors.ACCESS_FORBIDDEN);
    return;
  }
  next();
}
