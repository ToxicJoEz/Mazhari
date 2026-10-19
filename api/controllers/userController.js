import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { checkDBStatus } from '../config/db.js';

/**
 * Get current user profile
 * GET /api/users/profile
 */
export const getProfile = async (req, res) => {
  try {
    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        user: {
          id: req.user._id || req.user.id,
          name: req.user.name || 'Mazhari Client',
          email: req.user.email || 'client@mazhari.com',
          mobile: '+201000000000',
          role: req.user.role || 'customer',
          addresses: [],
        },
      });
    }

    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.',
      error: error.message,
    });
  }
};

/**
 * Update current user profile
 * PUT /api/users/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, mobile, addresses } = req.body;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully (scaffold mode).',
        user: {
          id: req.user._id,
          name: name || req.user.name,
          mobile: mobile || '+201000000000',
          addresses: addresses || [],
        },
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name) user.name = name.trim();
    if (mobile) user.mobile = mobile.trim();
    if (Array.isArray(addresses)) user.addresses = addresses;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
      error: error.message,
    });
  }
};

/**
 * Change account password
 * PUT /api/users/change-password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are both required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Password changed successfully (scaffold mode).',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match our records.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password.',
      error: error.message,
    });
  }
};

/**
 * Soft delete account (User initiated)
 * DELETE /api/users/profile
 */
export const softDeleteAccount = async (req, res) => {
  try {
    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Account soft-deleted successfully (scaffold mode).',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message:
        'Your account has been deactivated. You can restore it at any time using the account recovery endpoint.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete account.',
      error: error.message,
    });
  }
};

/**
 * Restore soft-deleted account
 * POST /api/users/restore
 */
export const restoreAccount = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required to restore your account.',
      });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Account restored successfully (scaffold mode).',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (!user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'This account is already active.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    user.isDeleted = false;
    user.deletedAt = null;
    await user.save();

    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Your Mazhari account has been restored successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to restore account.',
      error: error.message,
    });
  }
};
