const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;

const format = (level, message) => {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${message}`;
};

const logger = {
  error: (msg) => currentLevel >= LOG_LEVELS.error && console.error(format('error', msg)),
  warn: (msg) => currentLevel >= LOG_LEVELS.warn && console.warn(format('warn', msg)),
  info: (msg) => currentLevel >= LOG_LEVELS.info && console.log(format('info', msg)),
  debug: (msg) => currentLevel >= LOG_LEVELS.debug && console.log(format('debug', msg))
};

module.exports = logger;
