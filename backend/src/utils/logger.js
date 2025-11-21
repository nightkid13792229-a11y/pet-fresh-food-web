import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || path.resolve('logs');
const logLevel = process.env.LOG_LEVEL || 'info';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const formats = [
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: time, stack, ...meta }) => {
    const rest = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${time}] ${level}: ${stack || message}${rest}`;
  })
];

const logger = winston.createLogger({
  level: logLevel,
  format: combine(...formats),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
  ]
});

// 始终输出到控制台（包括生产环境），方便 PM2 查看日志
logger.add(
  new winston.transports.Console({
    format: combine(colorize(), ...formats)
  })
);

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

export default logger;



