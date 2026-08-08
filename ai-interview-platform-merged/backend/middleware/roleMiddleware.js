/**
 * Restricts a route to one or more roles.
 * Usage: router.get('/admin-only', authenticateJWT, authorizeRoles('admin'), handler)
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource' });
    }
    next();
  };
}

module.exports = authorizeRoles;
