import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import 'express-async-errors';

import config from './config/index.js';
import routes from './routes/index.js';
import requestLogger from './middleware/requestLogger.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';

const app = express();

// Core middleware
app.disable('x-powered-by');
// 配置 helmet 允许 CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
// CORS 配置 - 允许所有来源或配置的来源
app.use(cors({
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (combined with morgan & winston)
if (config.env !== 'test') {
  app.use(morgan('tiny', { stream: config.logger.stream }));
}
app.use(requestLogger);

// Routes
app.use('/api/v1', routes);

// Healthcheck for infra
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 404 & error handling
app.use(notFound);
app.use(errorHandler);

export default app;



