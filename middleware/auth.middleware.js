const jwt = require('jsonwebtoken');
const createError = require('http-errors');

const authMiddleware = (req, res, next) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;
    
    // Check if header exists
    if (!authHeader) {
      return next(createError(401, 'Authorization header missing'));
    }

    // Verify Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next(createError(401, 'Invalid Authorization header format'));
    }

    const token = parts[1];

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(createError(401, 'Token expired'));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(createError(401, 'Invalid token'));
    }
    next(err);
  }
};

module.exports = authMiddleware;
