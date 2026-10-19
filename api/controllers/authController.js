import User from '../models/User.js';
import PasswordResetRequest from '../models/PasswordResetRequest.js';
import { generateToken } from '../utils/jwt.js';
import { checkDBStatus } from '../config/db.js';

/**
 * Register a new customer
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, mobile, address } = req.body;

    if (!name || !email || !password || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and mobile number are required.',
      });
    }

    const db = checkDBStatus();

    if (!db.isReady) {
      // Mock response if DB connection string is pending
      const mockUser = {
        id: 'mock-user-123',
        name,
        email,
        mobile,
        role: 'customer',
      };
      const token = generateToken(mockUser);
      return res.status(201).json({
        success: true,
        message: 'Account registered successfully (scaffold mode).',
        token,
        user: mockUser,
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const initialAddresses = address ? [{ ...address, isDefault: true }] : [];

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      mobile,
      role: 'customer',
      addresses: initialAddresses,
    });

    await user.save();

    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed.',
      error: error.message,
    });
  }
};

/**
 * Login user & return JWT token
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const db = checkDBStatus();

    if (!db.isReady) {
      // Scaffold mode fallback
      const mockRole = email.includes('admin') ? 'admin' : 'customer';
      const mockUser = {
        id: 'mock-session-123',
        name: 'Mazhari Client',
        email,
        mobile: '+201000000000',
        role: mockRole,
      };
      const token = generateToken(mockUser);
      return res.status(200).json({
        success: true,
        message: 'Login successful (scaffold mode).',
        token,
        user: mockUser,
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message:
          'This account has been deleted. Use the restore endpoint (/api/users/restore) to reactivate it.',
        isDeleted: true,
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: `Your account has been suspended. Reason: ${user.banReason || 'Contact support'}`,
        isBanned: true,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed.',
      error: error.message,
    });
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
