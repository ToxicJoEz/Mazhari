import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import PasswordResetRequest from '../models/PasswordResetRequest.js';
import bcrypt from 'bcryptjs';
import { checkDBStatus } from '../config/db.js';

// ==========================================
// 1. PASSWORD RESET REQUESTS & ADMIN RESET
// ==========================================

/**
 * Get all password reset requests (Admin notification feed)
 * GET /api/admin/password-requests
 */
export const getPasswordRequests = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        requests: [
          {
            _id: 'req-1',
            email: 'client@example.com',
            mobile: '+201012345678',
            status: 'pending',
            createdAt: new Date(),
          },
        ],
      });
    }

    const query = status === 'all' ? {} : { status };
    const requests = await PasswordResetRequest.find(query)
      .populate('user', 'name email mobile role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve password reset requests.',
      error: error.message,
    });
  }
};

/**
 * Resolve request & manually set new password for account
 * POST /api/admin/password-requests/:id/fulfill
 */
export const fulfillPasswordRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, adminNotes } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Password reset fulfilled (scaffold mode).',
      });
    }

    const resetReq = await PasswordResetRequest.findById(id);
    if (!resetReq) {
      return res.status(404).json({ success: false, message: 'Reset request not found.' });
    }

    const user = await User.findById(resetReq.user);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated user not found.' });
    }

    user.password = newPassword; // Will be hashed by User pre('save') hook
    await user.save();

    resetReq.status = 'resolved';
    resetReq.resolvedAt = new Date();
    resetReq.resolvedBy = req.user._id;
    resetReq.adminNotes = adminNotes || `Password manually reset by admin (${req.user.email})`;
    await resetReq.save();

    res.status(200).json({
      success: true,
      message: `Password successfully updated for ${user.email}. Request marked as resolved.`,
      user: {
        id: user._id,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fulfill password request.',
      error: error.message,
    });
  }
};

/**
 * Set a user password manually at any time
 * POST /api/admin/users/:id/set-password
 */
export const setUserPasswordManually = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Password updated (scaffold mode).',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Password successfully set for ${user.email}.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to set user password.',
      error: error.message,
    });
  }
};

// ==========================================
// 2. USER MANAGEMENT (BAN / UNBAN / SOFT DELETE / EDIT)
// ==========================================

/**
 * Get all users with filters and search
 * GET /api/admin/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        count: 1,
        total: 1,
        page: 1,
        users: [
          {
            _id: 'mock-1',
            name: 'Demo Admin',
            email: 'admin@mazhari.com',
            mobile: '+201000000000',
            role: 'admin',
            isBanned: false,
            isDeleted: false,
          },
        ],
      });
    }

    const query = {};

    if (role) query.role = role;

    if (status === 'banned') query.isBanned = true;
    if (status === 'deleted') query.isDeleted = true;
    if (status === 'active') {
      query.isBanned = false;
      query.isDeleted = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
      error: error.message,
    });
  }
};

/**
 * Get single user full profile and orders
 * GET /api/admin/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({ success: true, user: { id } });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      user,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details.',
      error: error.message,
    });
  }
};

/**
 * Edit user information & role
 * PUT /api/admin/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, role } = req.body;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({ success: true, message: 'User updated (scaffold mode).' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (mobile) user.mobile = mobile.trim();
    if (role && ['customer', 'admin'].includes(role)) user.role = role;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User account updated successfully.',
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
      message: 'Failed to update user.',
      error: error.message,
    });
  }
};

/**
 * Ban user account
 * PATCH /api/admin/users/:id/ban
 */
export const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({ success: true, message: 'User banned (scaffold mode).' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isBanned = true;
    user.banReason = reason || 'Suspended by administrator';
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.email} has been suspended.`,
      user: { id: user._id, isBanned: user.isBanned, banReason: user.banReason },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to ban user.',
      error: error.message,
    });
  }
};

/**
 * Unban user account
 * PATCH /api/admin/users/:id/unban
 */
export const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({ success: true, message: 'User unbanned (scaffold mode).' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isBanned = false;
    user.banReason = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.email} has been unsuspended.`,
      user: { id: user._id, isBanned: user.isBanned },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unban user.',
      error: error.message,
    });
  }
};

/**
 * Soft delete user by admin
 * DELETE /api/admin/users/:id
 */
export const softDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({ success: true, message: 'User soft-deleted (scaffold mode).' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.email} has been soft-deleted.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to soft delete user.',
      error: error.message,
    });
  }
};

/**
 * Restore soft-deleted user by admin
 * PATCH /api/admin/users/:id/restore
 */
export const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({ success: true, message: 'User restored (scaffold mode).' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isDeleted = false;
    user.deletedAt = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.email} has been reactivated.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to restore user.',
      error: error.message,
    });
  }
};

// ==========================================
// 3. PRODUCT & INVENTORY MANAGEMENT
// ==========================================

/**
 * Get all products (Admin view including soft-deleted and inactive)
 * GET /api/admin/products
 */
export const getAllProductsAdmin = async (req, res) => {
  try {
    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        products: [],
        message: 'Admin products (scaffold mode).',
      });
    }

    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin product list.',
      error: error.message,
    });
  }
};

/**
 * Add a new luxury piece to inventory
 * POST /api/admin/products
 */
export const createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      basePrice,
      shippingFee = 0,
      colors = [],
      sizes = [],
      variants = [],
      images = [],
      isActive = true,
    } = req.body;

    if (!title || !category || basePrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, and base price are required.',
      });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(201).json({
        success: true,
        message: 'Product created (scaffold mode).',
        product: req.body,
      });
    }

    const product = new Product({
      title: title.trim(),
      description: description || '',
      category: category.trim(),
      basePrice: Number(basePrice),
      shippingFee: Number(shippingFee),
      colors,
      sizes,
      variants,
      images,
      isActive,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product piece created successfully.',
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create product.',
      error: error.message,
    });
  }
};

/**
 * Edit product information
 * PUT /api/admin/products/:id
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Product updated (scaffold mode).',
        product: req.body,
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const {
      title,
      description,
      category,
      basePrice,
      shippingFee,
      colors,
      sizes,
      variants,
      images,
      isActive,
    } = req.body;

    if (title) product.title = title.trim();
    if (description !== undefined) product.description = description;
    if (category) product.category = category.trim();
    if (basePrice !== undefined) product.basePrice = Number(basePrice);
    if (shippingFee !== undefined) product.shippingFee = Number(shippingFee);
    if (Array.isArray(colors)) product.colors = colors;
    if (Array.isArray(sizes)) product.sizes = sizes;
    if (Array.isArray(variants)) product.variants = variants;
    if (Array.isArray(images)) product.images = images;
    if (isActive !== undefined) product.isActive = Boolean(isActive);

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product.',
      error: error.message,
    });
  }
};

/**
 * Update stock quantities per variant
 * PATCH /api/admin/products/:id/stock
 */
export const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { variants } = req.body; // Expects array: [{ color, size, stock }]

    if (!Array.isArray(variants)) {
      return res.status(400).json({
        success: false,
        message: 'Variants array with color, size, and stock is required.',
      });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({ success: true, message: 'Stock updated (scaffold mode).' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    product.variants = variants;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Stock levels updated successfully.',
      variants: product.variants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update stock.',
      error: error.message,
    });
  }
};

/**
 * Soft delete product (hides from storefront, preserves past order data)
 * DELETE /api/admin/products/:id
 */
export const softDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({ success: true, message: 'Product soft-deleted (scaffold mode).' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    product.isDeleted = true;
    product.deletedAt = new Date();
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product "${product.title}" has been soft-deleted.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product.',
      error: error.message,
    });
  }
};

/**
 * Restore soft-deleted product
 * PATCH /api/admin/products/:id/restore
 */
export const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({ success: true, message: 'Product restored (scaffold mode).' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    product.isDeleted = false;
    product.deletedAt = null;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product "${product.title}" has been restored to storefront.`,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to restore product.',
      error: error.message,
    });
  }
};

/**
 * Cloudinary image upload placeholder
 * POST /api/admin/products/upload
 */
export const uploadImagePlaceholder = (req, res) => {
  // Cloudinary credentials placeholder
  // When ready: configure cloudinary.uploader.upload_stream
  const mockUrl = `/src/assets/placeholder_${Date.now()}.jpg`;

  res.status(200).json({
    success: true,
    message:
      'Cloudinary image upload placeholder. Ready to link your CLOUDINARY_URL in environment.',
    imageUrl: mockUrl,
  });
};

// ==========================================
// 4. ORDER MANAGEMENT & BIDIRECTIONAL STATUS
// ==========================================

const ALLOWED_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

const ALLOWED_PAYMENT_STATUSES = ['unpaid', 'cash_collected', 'delivery_failed'];

/**
 * Get all orders with status/payment filters
 * GET /api/admin/orders
 */
export const getAllOrders = async (req, res) => {
  try {
    const { status, paymentStatus, search, page = 1, limit = 20 } = req.query;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        orders: [],
        message: 'Admin orders (scaffold mode).',
      });
    }

    const query = {};
    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.mobile': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders.',
      error: error.message,
    });
  }
};

/**
 * Update order status bidirectionally (Allows moving back and forth)
 * PATCH /api/admin/orders/:id/status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status || !ALLOWED_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_ORDER_STATUSES.join(', ')}`,
      });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: `Order status updated to ${status} (scaffold mode).`,
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = status;

    order.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.user.email,
      note: note || `Status transitioned from ${previousStatus} to ${status} by admin`,
    });

    // Auto-update Cash on Delivery payment status when marked delivered
    if (status === 'delivered' && order.paymentStatus === 'unpaid') {
      order.paymentStatus = 'cash_collected';
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} status changed from ${previousStatus} to ${status}.`,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order status.',
      error: error.message,
    });
  }
};

/**
 * Update Cash on Delivery payment status
 * PATCH /api/admin/orders/:id/payment
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!paymentStatus || !ALLOWED_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUSES.join(', ')}`,
      });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: `Payment status updated to ${paymentStatus} (scaffold mode).`,
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} COD payment status set to ${paymentStatus}.`,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status.',
      error: error.message,
    });
  }
};

// ==========================================
// 5. ANALYTICS & OVERVIEW
// ==========================================

/**
 * Get dashboard overview metrics
 * GET /api/admin/metrics
 */
export const getOverviewMetrics = async (req, res) => {
  try {
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        metrics: {
          totalRevenue: 28450,
          pendingCashToCollect: 8650,
          totalOrders: 14,
          deliveredOrders: 9,
          pendingOrders: 5,
          activeUsers: 42,
          bannedUsers: 0,
          pendingPasswordRequests: 1,
        },
      });
    }

    const [totalOrders, deliveredOrders, pendingOrders, users, passwordReqs] =
      await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ orderStatus: 'delivered' }),
        Order.countDocuments({ orderStatus: { $in: ['pending', 'confirmed', 'processing'] } }),
        User.countDocuments({ isDeleted: false }),
        PasswordResetRequest.countDocuments({ status: 'pending' }),
      ]);

    const cashCollectedAgg = await Order.aggregate([
      { $match: { paymentStatus: 'cash_collected' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const pendingCashAgg = await Order.aggregate([
      { $match: { paymentStatus: 'unpaid', orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    res.status(200).json({
      success: true,
      metrics: {
        totalRevenue: cashCollectedAgg[0]?.total || 0,
        pendingCashToCollect: pendingCashAgg[0]?.total || 0,
        totalOrders,
        deliveredOrders,
        pendingOrders,
        activeUsers: users,
        pendingPasswordRequests: passwordReqs,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to compute metrics.',
      error: error.message,
    });
  }
};
