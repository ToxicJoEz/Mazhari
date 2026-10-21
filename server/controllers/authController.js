import User from '../models/User.js';
import PasswordResetRequest from '../models/PasswordResetRequest.js';
import { generateToken, getJWTSecret } from '../utils/jwt.js';
import { checkDBStatus } from '../config/db.js';

const publicUser = (user) => ({
  id: user._id, name: user.name, email: user.email, mobile: user.mobile,
  role: user.role, addresses: user.addresses,
});
const unavailable = (res) => res.status(503).json({ success: false, message: 'Account service temporarily unavailable. Please try again shortly.' });

export const register = async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body || {};
    if ([name, email, password, mobile].some(value => typeof value !== 'string' || !value.trim()) ||
        name.trim().length > 100 || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim()) ||
        !/^[+()\d\s-]{7,25}$/.test(mobile.trim()) || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Enter your name, a valid email and phone number, and a password of at least 8 characters (maximum 72 bytes).' });
    }
    if (!checkDBStatus().isReady) return unavailable(res);
    getJWTSecret();
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' });
    }
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password, mobile: mobile.trim(), role: 'customer' });
    const token = generateToken({ id: user._id, role: user.role, email: user.email });
    return res.status(201).json({ success: true, message: 'Account created successfully.', token, user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' });
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Please check your account details.' });
    return unavailable(res);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || email.length > 254 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Please enter your email and password.' });
    }
    if (!checkDBStatus().isReady) return unavailable(res);
    getJWTSecret();
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (user.isDeleted || user.isBanned) {
      return res.status(403).json({ success: false, message: 'This account is unavailable. Please contact Mazhari support.' });
    }
    const token = generateToken({ id: user._id, role: user.role, email: user.email });
    return res.json({ success: true, message: 'Login successful.', token, user: publicUser(user) });
  } catch {
    return unavailable(res);
  }
};

/**
 * Request password reset (Creates admin notification with email & mobile)
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or mobile

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address or mobile phone number.',
      });
    }

    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message:
          'Your password reset request has been received. Our administration team has been notified and will verify your mobile number to reset your password.',
      });
    }

    const query = {
      $or: [
        { email: identifier.trim().toLowerCase() },
        { mobile: identifier.trim() },
      ],
    };

    const user = await User.findOne(query);

    if (!user) {
      // Security practice: Don't explicitly reveal non-existence, but inform customer
      return res.status(200).json({
        success: true,
        message:
          'If an account matches our records, a reset request notification has been sent to our administration team.',
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Cannot request password reset for a suspended account. Please contact Mazhari support.',
      });
    }

    // Check for existing pending request to prevent spamming
    const existingPending = await PasswordResetRequest.findOne({
      user: user._id,
      status: 'pending',
    });

    if (existingPending) {
      return res.status(200).json({
        success: true,
        message:
          'A reset request for this account is already pending with our administration team. You will be contacted shortly.',
      });
    }

    // Create the admin notification record
    const resetRequest = new PasswordResetRequest({
      user: user._id,
      email: user.email,
      mobile: user.mobile,
      status: 'pending',
    });

    await resetRequest.save();

    res.status(200).json({
      success: true,
      message:
        'Your password reset request has been sent to the Mazhari administration. An admin will review your account information and assist you with your new password.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit password reset request.',
      error: error.message,
    });
  }
};
