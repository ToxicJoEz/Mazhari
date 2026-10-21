import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import PasswordResetRequest from '../models/PasswordResetRequest.js';
import * as v from '../utils/validation.js';
import { publicUser } from './authController.js';
import { imageUrl } from './storeController.js';
const userById = async (id) => {
  const user = await User.findById(v.objectId(id));
  if (!user) v.fail(404, 'Account not found.');
  return user;
};
const customerOnly = (user) => {
  if (user.role === 'admin')
    v.fail(
      403,
      'Administrator accounts are protected. Use your profile to update your own details or password.',
    );
};
export const getOverviewMetrics = async (req, res) => {
  const [totalOrders, customers, pendingRequests, lowStock, cash, pending, unconfigured] =
    await Promise.all([
      Order.countDocuments(),
      User.countDocuments({ role: 'customer', isDeleted: false }),
      PasswordResetRequest.countDocuments({ status: 'pending' }),
      Product.countDocuments({
        isDeleted: false,
        isActive: true,
        variants: { $elemMatch: { stock: { $lte: 3 } } },
      }),
      Order.aggregate([
        { $match: { paymentStatus: 'cash_collected', orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ orderStatus: { $in: ['pending', 'confirmed', 'processing'] } }),
      import('./storeController.js')
        .then((m) => m.getSettings())
        .then((s) => s.shippingRates.filter((r) => r.enabled && r.fee === null).length),
    ]);
  res.json({
    success: true,
    metrics: {
      totalOrders,
      customers,
      pendingRequests,
      lowStock,
      cashCollected: cash[0]?.total || 0,
      pendingOrders: pending,
      unconfiguredShipping: unconfigured,
    },
  });
};
export const getAllUsers = async (req, res) => {
  const { page, limit } = v.pageParams(req.query);
  const q = {};
  if (req.query.search) {
    const regex = new RegExp(v.escapeRegex(String(req.query.search).slice(0, 100)), 'i');
    q.$or = [{ name: regex }, { email: regex }, { mobile: regex }];
  }
  if (req.query.status === 'banned') q.isBanned = true;
  if (req.query.status === 'deleted') q.isDeleted = true;
  const [users, total] = await Promise.all([
    User.find(q)
      .select('-password -tokenVersion')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(q),
  ]);
  res.json({ success: true, users, total, page, pages: Math.ceil(total / limit) });
};
export const getUserById = async (req, res) => {
  const user = await userById(req.params.id);
  const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({
    success: true,
    user: {
      ...publicUser(user),
      isBanned: user.isBanned,
      isDeleted: user.isDeleted,
      banReason: user.banReason,
    },
    orders,
  });
};
export const updateUser = async (req, res) => {
  const user = await userById(req.params.id);
  customerOnly(user);
  if (req.body.name !== undefined) user.name = v.text(req.body.name, 'name', 100);
  if (req.body.mobile !== undefined) user.mobile = v.phone(req.body.mobile);
  await user.save();
  res.json({ success: true, user: publicUser(user) });
};
const setAccount = async (req, res, operation) => {
  const user = await userById(req.params.id);
  customerOnly(user);
  if (operation === 'ban') {
    user.isBanned = true;
    user.banReason = v.text(req.body.reason || 'Please contact support.', 'reason', 300);
  }
  if (operation === 'unban') {
    user.isBanned = false;
    user.banReason = null;
  }
  if (operation === 'delete') {
    user.isDeleted = true;
    user.deletedAt = new Date();
  }
  if (operation === 'restore') {
    user.isDeleted = false;
    user.deletedAt = null;
  }
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  res.json({ success: true, message: 'Account updated.' });
};
export const banUser = (req, res) => setAccount(req, res, 'ban');
export const unbanUser = (req, res) => setAccount(req, res, 'unban');
export const softDeleteUser = (req, res) => setAccount(req, res, 'delete');
export const restoreUser = (req, res) => setAccount(req, res, 'restore');
export const getPasswordRequests = async (req, res) =>
  res.json({
    success: true,
    requests: await PasswordResetRequest.find(req.query.status ? { status: req.query.status } : {})
      .sort({ createdAt: -1 })
      .limit(100),
  });
export const fulfillPasswordRequest = async (req, res) => {
  const newPassword = v.password(req.body.newPassword),
    session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const request = await PasswordResetRequest.findById(v.objectId(req.params.id)).session(
        session,
      );
      if (!request || request.status !== 'pending')
        v.fail(409, 'This request has already been handled or does not exist.');
      const user = await User.findById(request.user).session(session);
      if (!user || user.isDeleted || user.isBanned) v.fail(400, 'This account is unavailable.');
      customerOnly(user);
      user.password = newPassword;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save({ session });
      request.status = 'resolved';
      request.resolvedAt = new Date();
      request.resolvedBy = req.user._id;
      request.adminNotes = v.text(
        req.body.adminNotes || 'Identity verified by phone.',
        'notes',
        1000,
      );
      await request.save({ session });
    });
  } finally {
    await session.endSession();
  }
  res.json({
    success: true,
    message: 'Password reset completed. All previous sessions are invalidated.',
  });
};
export const setUserPasswordManually = async (req, res) => {
  const user = await userById(req.params.id);
  customerOnly(user);
  user.password = v.password(req.body.newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  res.json({ success: true, message: 'Password updated. Previous sessions have ended.' });
};
export const getAllProductsAdmin = async (req, res) => {
  const { page, limit } = v.pageParams(req.query);
  const q = {};
  if (req.query.status === 'active') q.isDeleted = false;
  if (req.query.status === 'deleted') q.isDeleted = true;
  if (req.query.search)
    q.title = new RegExp(v.escapeRegex(String(req.query.search).slice(0, 100)), 'i');
  if (req.query.category) q.category = v.text(req.query.category, 'collection', 80);
  const [products, total, categories] = await Promise.all([
    Product.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(q),
    Product.distinct('category'),
  ]);
  res.json({
    success: true,
    products,
    total,
    page,
    pages: Math.ceil(total / limit),
    collections: categories.filter(Boolean).sort((a, b) => a.localeCompare(b)),
  });
};
export const productData = (body) => {
  if (!Array.isArray(body.variants) || !body.variants.length || body.variants.length > 200)
    v.fail(400, 'Add between 1 and 200 size / color variants.');
  const variants = body.variants.map((row) => {
    if (!Number.isInteger(Number(row.stock)) || Number(row.stock) < 0 || Number(row.stock) > 100000)
      v.fail(400, 'Stock must be a whole number from 0 to 100000.');
    return {
      color: v.text(row.color, 'variant color', 80),
      size: v.text(row.size, 'variant size', 30),
      stock: Number(row.stock),
    };
  });
  if (
    new Set(variants.map((a) => a.color.toLowerCase() + '|' + a.size.toLowerCase())).size !==
    variants.length
  )
    v.fail(400, 'Each size / color pair must be unique.');
  const images = (Array.isArray(body.images) ? body.images : [])
    .filter(Boolean)
    .slice(0, 8)
    .map(imageUrl);
  return {
    title: v.text(body.title, 'product name', 150),
    description: v.text(body.description || '', 'description', 4000, false),
    category: v.text(body.category, 'collection', 80),
    basePrice: v.amount(body.basePrice),
    material: v.text(body.material || '', 'material', 300, false),
    care: v.text(body.care || '', 'care instructions', 500, false),
    variants,
    colors: [...new Set(variants.map((a) => a.color))],
    sizes: [...new Set(variants.map((a) => a.size))],
    images: images.length ? images : ['/images/product.svg'],
    isActive: body.isActive !== false,
    featured: body.featured === true,
  };
};
export const createProduct = async (req, res) =>
  res.status(201).json({ success: true, product: await Product.create(productData(req.body)) });
export const updateProduct = async (req, res) => {
  const product = await Product.findById(v.objectId(req.params.id));
  if (!product) v.fail(404, 'Product not found.');
  const data = productData(req.body);
  for (const old of product.variants) {
    if (
      !data.variants.some((a) => a.color === old.color && a.size === old.size) &&
      (await Order.exists({
        stockReserved: true,
        items: { $elemMatch: { product: product._id, color: old.color, size: old.size } },
      }))
    )
      v.fail(
        409,
        'A size / color variant is used by existing orders. Keep that variant and set its stock to zero.',
      );
  }
  Object.assign(product, data);
  await product.save();
  res.json({ success: true, product });
};
export const softDeleteProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    v.objectId(req.params.id),
    { $set: { isDeleted: true, deletedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!product) v.fail(404, 'Product not found.');
  res.json({ success: true, product });
};
export const restoreProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    v.objectId(req.params.id),
    { $set: { isDeleted: false, deletedAt: null } },
    { returnDocument: 'after' },
  );
  if (!product) v.fail(404, 'Product not found.');
  res.json({ success: true, product });
};
export const updateProductStock = async (req, res) => {
  const product = await Product.findById(v.objectId(req.params.id));
  if (!product) v.fail(404, 'Product not found.');
  req.body = { ...product.toObject(), variants: req.body.variants };
  return updateProduct(req, res);
};
export const getAllOrders = async (req, res) => {
  const { page, limit } = v.pageParams(req.query),
    q = {};
  if (req.query.status) q.orderStatus = req.query.status;
  if (req.query.payment) q.paymentStatus = req.query.payment;
  if (req.query.search) {
    const regex = new RegExp(v.escapeRegex(String(req.query.search).slice(0, 100)), 'i');
    q.$or = [
      { orderNumber: regex },
      { 'customer.name': regex },
      { 'customer.email': regex },
      { 'customer.mobile': regex },
    ];
  }
  const [orders, total] = await Promise.all([
    Order.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(q),
  ]);
  res.json({ success: true, orders, total, page, pages: Math.ceil(total / limit) });
};
