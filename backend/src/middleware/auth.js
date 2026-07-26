const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gecb_super_secure_jwt_secret_key_12345';

/**
 * Middleware to authenticate requests via JWT token in the Authorization header.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Token format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Middleware builder to restrict routes by role.
 * @param {Array<string>} roles - Roles allowed (e.g. ['ADMIN', 'TEACHER'])
 */
function requireRoles(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRoles,
};
