import './env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  logger.warn(`Missing environment variables: ${missing.join(', ')}`);
}

const logDir = process.env.LOG_DIR || path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || ['*']
  },
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10)
  },
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10)
  },
  wechat: {
    appId: process.env.WX_APP_ID,
    appSecret: process.env.WX_APP_SECRET
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: logDir
  },
  logger
};

export default config;


