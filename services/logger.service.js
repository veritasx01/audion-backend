import fs from 'fs';
import { asyncLocalStorage } from '../services/als.service.js';

export const loggerService = {
  debug(...args) {
    doLog('DEBUG', ...args);
  },
  info(...args) {
    doLog('INFO', ...args);
  },
  warn(...args) {
    doLog('WARN', ...args);
  },
  error(...args) {
    doLog('ERROR', ...args);
  },
};

const logsDir = './logs';

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

//define the time format
function getTime() {
  let now = new Date();
  return now.toLocaleString('he');
}

function isError(e) {
  return e && e.stack && e.message;
}

function doLog(level, ...args) {
  const strs = args.map(arg =>
    typeof arg === 'string' || isError(arg) ? arg : JSON.stringify(arg)
  );
  var logMsg = strs.join(' | ');

  // Add currently logged-in user from ALS to the log record
  const alsStore = asyncLocalStorage.getStore();
  const { username } = alsStore?.loggedinUser?.username;
  const userNameStr = username ? `(user: ${username})` : '';

  logMsg = `${getTime()} - ${level} - ${userNameStr} ${logMsg}\n`;
  console.log(logMsg);
  fs.appendFile('./logs/backend.log', logMsg, err => {
    if (err) console.log('FATAL: cannot write to log file');
  });
}
