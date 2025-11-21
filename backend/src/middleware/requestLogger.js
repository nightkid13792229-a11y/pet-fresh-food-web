import logger from '../utils/logger.js';

const requestLogger = (req, _res, next) => {
  const { method, originalUrl } = req;
  const start = Date.now();

  _res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${method} ${originalUrl} ${_res.statusCode} ${duration}ms`, {
      ip: req.ip,
      userId: req.user?.id
    });
  });

  next();
};

export default requestLogger;



