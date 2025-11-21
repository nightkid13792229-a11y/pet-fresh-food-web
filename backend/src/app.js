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
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
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



