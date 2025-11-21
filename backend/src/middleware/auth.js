import createError from 'http-errors';
import { verifyToken } from '../utils/token.js';
import { getProfile } from '../modules/users/users.service.js';

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'Authentication token missing'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    const user = await getProfile(payload.id);
    if (user.status === 'disabled') {
      return next(createError(403, 'Account disabled'));
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    return next();
  } catch (error) {
    return next(createError(401, 'Invalid or expired token'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      return next(createError(403, 'Insufficient permissions'));
    }
    return next();
  };
};

export {
  authenticate,
  authorize
};
