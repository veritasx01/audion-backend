import { loggerService } from "../services/logger.service.js";

export function log(req, res, next) {
  loggerService.info(
    `Path triggered: ${req.method} ${req.originalUrl} from ${req.ip}`
  );
  next();
}
