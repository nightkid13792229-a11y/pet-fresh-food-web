import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'express-async-errors';

import config from './config/index.js';
import routes from './routes/index.js';
import requestLogger from './middleware/requestLogger.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Core middleware
app.disable('x-powered-by');

// CORS 配置 - 允许所有来源或配置的来源（必须在所有其他中间件之前）
const corsOptions = {
  origin: function (origin, callback) {
    // 允许所有来源（开发环境）或配置的来源
    const allowedOrigins = config.cors.origin;
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // 临时允许所有，生产环境应该更严格
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 预检请求缓存时间（24小时）
};

// 显式处理 OPTIONS 请求（必须在 CORS 中间件之前，确保所有预检请求都能被处理）
app.options('*', (req, res) => {
  // 手动设置 CORS 头，确保所有 OPTIONS 请求都能正确响应
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type,Authorization');
  res.status(204).end();
});

// 应用 CORS 中间件
app.use(cors(corsOptions));

// 配置 helmet 允许 CORS（在 CORS 之后）
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (combined with morgan & winston)
if (config.env !== 'test') {
  app.use(morgan('tiny', { stream: config.logger.stream }));
}
app.use(requestLogger);

// 静态文件服务：提供上传的文件访问
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1y', // 缓存1年
  etag: true,
  lastModified: true
}));

// 添加路由调试日志
app.use('/api/v1', (req, res, next) => {
  if (req.path.includes('upload-cover')) {
    console.log('[app.js] 收到上传请求:', req.method, req.path, req.url);
    console.log('[app.js] 请求头:', JSON.stringify(req.headers, null, 2));
  }
  next();
}, routes);

// Healthcheck for infra
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 404 & error handling
app.use(notFound);
app.use(errorHandler);

export default app;



