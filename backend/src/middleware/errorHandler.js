import createError from 'http-errors';
import logger from '../utils/logger.js';

const errorHandler = (err, _req, res, _next) => {
  let error = err;
  if (!(err instanceof createError.HttpError)) {
    logger.error('Unhandled error', err);
    error = createError(500, 'Internal Server Error');
  }

  const payload = {
    success: false,
    message: error.message
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }

  res.status(error.status || 500).json(payload);
};

export default errorHandler;



