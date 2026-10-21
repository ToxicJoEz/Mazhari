import User from '../models/User.js';
import PasswordResetRequest from '../models/PasswordResetRequest.js';
import { generateToken, getJWTSecret } from '../utils/jwt.js';
import { checkDBStatus } from '../config/db.js';
import * as v from '../utils/validation.js';
export const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
  role: user.role,
  addresses: user.addresses,
  createdAt: user.createdAt,
});
export const sessionFor = (user) => ({
  token: generateToken({ id: user._id, version: user.tokenVersion || 0 }),
  user: publicUser(user),
});
const unavailable = (res) =>
  res.status(503).json({
    success: false,
    message: 'Account service temporarily unavailable. Please try again shortly.',
  });
export const register = async (req, res, next) => {
  try {
    const body = req.body || {};
    const data = {
      name: v.text(body.name, 'name', 100),
      email: v.email(body.email),
      mobile: v.phone(body.mobile),
      password: v.password(body.password),
    };
    if (!checkDBStatus().isReady) return unavailable(res);
    getJWTSecret();
    if (await User.exists({ email: data.email }))
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in.',
      });
    const user = await User.create({ ...data, role: 'customer' });
    res.status(201).json({ success: true, ...sessionFor(user) });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in.',
      });
    if (next) next(error);
    else res.status(error.status || 500).json({ success: false, message: error.message });
  }
};
export const login = async (req, res, next) => {
  try {
    const email = v.email(req.body?.email);
    if (
      typeof req.body?.password !== 'string' ||
      !req.body.password ||
      Buffer.byteLength(req.body.password) > 72
    )
      v.fail(400, 'Enter your email and password.');
    if (!checkDBStatus().isReady) return unavailable(res);
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(req.body.password)))
      v.fail(401, 'Invalid email or password.');
    if (user.isBanned) v.fail(403, 'This account is suspended. Please contact support.');
    if (user.isDeleted)
      return res.status(403).json({
        success: false,
        message: 'This account is deleted. Use Restore account to reactivate it.',
        canRestore: true,
      });
    res.json({ success: true, ...sessionFor(user) });
  } catch (error) {
    if (next) next(error);
    else res.status(error.status || 500).json({ success: false, message: error.message });
  }
};
export const forgotPassword = async (req, res) => {
  const identifier = v.text(req.body?.identifier, 'email or mobile number', 254);
  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { mobile: identifier }],
  });
  if (user && !user.isBanned && !user.isDeleted) {
    if (!(await PasswordResetRequest.exists({ user: user._id, status: 'pending' })))
      await PasswordResetRequest.create({ user: user._id, email: user.email, mobile: user.mobile });
  }
  res.json({
    success: true,
    message:
      'If an eligible account matches, your request is in our support inbox. Our team will contact you using the registered mobile number.',
  });
};
