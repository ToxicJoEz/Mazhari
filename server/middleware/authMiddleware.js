import { verifyTokenUtil } from '../utils/jwt.js';
import User from '../models/User.js';
import { checkDBStatus } from '../config/db.js';

/**
 * Verify JWT token middleware
 * Rejects expired tokens, banned accounts, and soft-deleted accounts
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication token missing.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyTokenUtil(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    const db = checkDBStatus();

    if (db.isReady) {
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists.',
        });
      }

      if (user.isDeleted) {
        return res.status(403).json({
          success: false,
          message: 'This account has been deleted. You can request account restoration.',
        });
      }

      if (user.isBanned) {
        return res.status(403).json({
          success: false,
          message: `This account has been suspended. Reason: ${user.banReason || 'Policy violation'}`,
        });
      }

      req.user = user;
    } else {
      return res.status(503).json({ success: false, message: 'Account service temporarily unavailable.' });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication verification error.',
      error: error.message,
    });
  }
};

/**
 * Admin role guard middleware
 */
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to administrators only.',
    });
  }
  next();
};

/**
 * Optional authentication middleware (for guest vs logged-in features)
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyTokenUtil(token);
    const db = checkDBStatus();

    if (db.isReady) {
      const user = await User.findById(decoded.id).select('-password');
      if (user && !user.isDeleted && !user.isBanned) {
        req.user = user;
      }
    }
  } catch {
    // If invalid token in optional auth, proceed as guest
  }

  next();
};
