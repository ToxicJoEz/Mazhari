import { verifyTokenUtil } from '../utils/jwt.js';
import User from '../models/User.js';
export const verifyToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
    const decoded = verifyTokenUtil(header.slice(7));
    const user = await User.findById(decoded.id).select('-password');
    if (
      !user ||
      user.isDeleted ||
      user.isBanned ||
      (decoded.version || 0) !== (user.tokenVersion || 0)
    )
      return res
        .status(401)
        .json({ success: false, message: 'Your session has ended. Please sign in again.' });
    req.user = user;
    next();
  } catch {
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
  }
};
export const isStaff = (req, res, next) =>
  ['admin', 'moderator'].includes(req.user?.role)
    ? next()
    : res.status(403).json({ success: false, message: 'Staff access required.' });
export const isAdmin = (req, res, next) =>
  req.user?.role === 'admin'
    ? next()
    : res.status(403).json({ success: false, message: 'Administrator access required.' });
export const optionalAuth = (req, res, next) =>
  req.headers.authorization ? verifyToken(req, res, next) : next();
