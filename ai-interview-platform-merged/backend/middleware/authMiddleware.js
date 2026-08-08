const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Verifies the JWT sent in the Authorization header ("Bearer <token>").
 * On success, attaches the decoded payload to req.user.
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    req.user = decoded; // { id, email, role, fullName }
    next();
  });
}

module.exports = authenticateJWT;
