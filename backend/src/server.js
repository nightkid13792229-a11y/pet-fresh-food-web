import config from './config/index.js';
import app from './app.js';
import { getPool } from './db/pool.js';
import logger from './utils/logger.js';
import { validateEnv } from './config/env-validator.js';

async function startServer() {
  try {
    // 1. 验证环境变量（在启动前）
    validateEnv();
    
    // 2. 测试数据库连接
    const pool = await getPool();
    await pool.query('SELECT 1');
    logger.info('Database connection established');

    const server = app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port} (env: ${config.env})`);
    });

    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await pool.end();
          logger.info('Database pool closed');
        } catch (err) {
          logger.error('Error closing database pool', err);
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();



