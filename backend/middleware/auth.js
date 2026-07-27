/**
 * Authentication & Authorization Middleware
 * ==========================================
 *
 * Middleware chain for protected routes:
 *   protect()  →  verifies JWT cookie, sets req.user
 *   authorize()  →  checks req.user.role against allowed roles
 *
 * Usage in routes:
 *   router.get('/', protect, authorize('admin'), handler)
 *   router.get('/', protect, handler)  ← any authenticated user
 *
 * Important: JWT is stored in an httpOnly cookie, NOT localStorage.
 * This prevents XSS attacks — JavaScript cannot read the token.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — JWT Authentication Middleware
 * -----------------------------------------
 * 1. Extracts JWT from req.cookies.token (set on login)
 * 2. Verifies the token with JWT_SECRET
 * 3. Loads the full user document (without password) into req.user
 * 4. Calls next() if valid, or returns 401 if missing/invalid
 */
const protect = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé, pas de token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Non autorisé, utilisateur introuvable' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Non autorisé, token invalide' });
  }
};

/**
 * authorize — Role-Based Access Control Middleware
 * -------------------------------------------------
 * Restricts route access to specific roles.
 * Must be used AFTER protect() so req.user is populated.
 *
 * Roles: 'admin', 'ingenieur', 'employe', 'visiteur'
 *
 * Examples:
 *   authorize('admin')              → admin only
 *   authorize('admin', 'ingenieur') → admin and ingenieur
 *
 * Returns 403 Forbidden if the user's role is not in the allowed list.
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Le rôle ${req.user.role} n'est pas autorisé à accéder à cette ressource`
    });
  }
  next();
};

module.exports = { protect, authorize };
