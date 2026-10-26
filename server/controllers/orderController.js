import mongoose from 'mongoose';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import { getSettings } from './storeController.js';
import { normalizeItems } from './cartController.js';
import { getJWTSecret } from '../utils/jwt.js';
import * as v from '../utils/validation.js';
import { GOVERNORATES, ORDER_STATUSES, PAYMENT_STATUSES } from '../../shared/constants.js';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const guestToken = (key) =>
  createHmac('sha256', getJWTSecret())
    .update('guest-order:' + key)
    .digest('hex');
const history = (req, status, note) => ({
  status,
  changedBy: req.user?.email || 'guest',
  changedAt: new Date(),
  note,
});
export const quoteOrder = async (req, res) => {
  const governorate = req.body.governorate;
  if (!GOVERNORATES.includes(governorate)) v.fail(400, 'Choose your governorate.');
  const settings = await getSettings(),
    rate = settings.shippingRates.find((r) => r.governorate === governorate);
  if (!rate?.enabled || rate.fee === null || rate.fee === undefined)
    v.fail(400, 'Shipping for this governorate needs confirmation. Please contact the store.');
  const normalized = await normalizeItems(req.body.items);
  if (!normalized.items.length) v.fail(400, 'Your bag is empty.');
  const subtotal =
    normalized.items.reduce((n, i) => n + Math.round(i.price * 100) * i.quantity, 0) / 100;
  res.json({
    success: true,
    quote: {
      items: normalized.items,
      subtotal,
      shippingFee: rate.fee,
      total: Math.round((subtotal + rate.fee) * 100) / 100,
    },
  });
};
export const createOrder = async (req, res) => {
  const body = req.body || {};
  if (body.acceptedTerms !== true)
    v.fail(400, 'Please review and accept the store terms before ordering.');
  const customer = {
    name: v.text(body.customer?.name, 'full name', 100),
    email: v.email(body.customer?.email),
    mobile: v.phone(body.customer?.mobile),
    whatsapp: body.customer?.whatsapp ? v.phone(body.customer.whatsapp) : '',
  };
  const a = body.shippingAddress || {};
  if (!GOVERNORATES.includes(a.governorate)) v.fail(400, 'Choose your governorate.');
  const shippingAddress = {
    street: v.text(a.street, 'street address', 300),
    city: v.text(a.city, 'city / district', 100),
    governorate: a.governorate,
    zip: v.text(a.zip || '', 'postal code', 20, false),
    notes: v.text(a.notes || '', 'delivery notes', 1000, false),
  };
  const idempotencyKey = v.text(body.idempotencyKey, 'checkout request key', 100);
  if (idempotencyKey.length < 16) v.fail(400, 'Invalid checkout request key.');
  const requestKey = hash(
    (req.user?._id?.toString() || customer.email + customer.mobile) + ':' + idempotencyKey,
  );
  const fingerprint = hash(JSON.stringify({ customer, shippingAddress, items: body.items }));
  const token = guestToken(requestKey);
  const existing = await Order.findOne({ requestKey }).select('+requestFingerprint');
  if (existing) {
    const order = existing.toObject();
    delete order.requestFingerprint;
    if (existing.requestFingerprint !== fingerprint)
      return res.status(409).json({
        success: false,
        message:
          'This checkout was already saved. Review the existing order before placing another.',
        savedOrder: order,
        trackingToken: req.user ? undefined : token,
      });
    return res.json({ success: true, order, trackingToken: req.user ? undefined : token });
  }
  const settings = await getSettings();
  const rate = settings.shippingRates.find((r) => r.governorate === a.governorate);
  if (!rate?.enabled || rate.fee === null || rate.fee === undefined)
    v.fail(400, 'Shipping for this governorate needs confirmation. Please contact the store.');
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const normalized = await normalizeItems(body.items, { session });
      if (!normalized.items.length) v.fail(400, 'Your bag is empty.');
      for (const item of normalized.items) {
        const updated = await Product.updateOne(
          {
            _id: item.product,
            isActive: true,
            isDeleted: false,
            variants: {
              $elemMatch: { size: item.size, color: item.color, stock: { $gte: item.quantity } },
            },
          },
          { $inc: { 'variants.$.stock': -item.quantity } },
          { session },
        );
        if (updated.modifiedCount !== 1)
          v.fail(409, 'Stock changed while you were checking out. Please review your bag.');
      }
      const subtotal =
        normalized.items.reduce(
          (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
          0,
        ) / 100;
      if (
        body.expectedTotal === undefined ||
        Math.round(Number(body.expectedTotal) * 100) !== Math.round((subtotal + rate.fee) * 100)
      )
        v.fail(
          409,
          'Prices or delivery rates changed. Refresh the order summary before placing your order.',
        );
      [order] = await Order.create(
        [
          {
            orderNumber:
              'MZH-' +
              new Date().toISOString().slice(2, 10).replaceAll('-', '') +
              '-' +
              randomBytes(4).toString('hex').toUpperCase(),
            requestKey,
            requestFingerprint: fingerprint,
            guestTokenHash: hash(token),
            user: req.user?._id || null,
            customer,
            shippingAddress,
            items: normalized.items,
            subtotal,
            shippingFee: rate.fee,
            total: Math.round((subtotal + rate.fee) * 100) / 100,
            stockReserved: true,
            policyAcceptedAt: new Date(),
            statusHistory: [history(req, 'pending', 'Cash on delivery order placed')],
          },
        ],
        { session },
      );
      if (req.user)
        await Cart.updateOne(
          { user: req.user._id },
          { $set: { items: [] }, $inc: { revision: 1 } },
          { session },
        );
    });
  } catch (error) {
    if (error.code === 11000) {
      const retry = await Order.findOne({ requestKey }).select('+requestFingerprint');
      if (retry && retry.requestFingerprint === fingerprint) {
        const clean = retry.toObject();
        delete clean.requestFingerprint;
        return res.json({
          success: true,
          order: clean,
          trackingToken: req.user ? undefined : token,
        });
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
  const clean = order.toObject();
  delete clean.guestTokenHash;
  delete clean.requestKey;
  delete clean.requestFingerprint;
  res
    .status(201)
    .json({ success: true, order: clean, trackingToken: req.user ? undefined : token });
};
export const getMyOrders = async (req, res) => {
  const { page, limit } = v.pageParams(req.query);
  const query = { user: req.user._id };
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(query),
  ]);
  const visible = orders.map((order) => {
    const item = order.toObject();
    item.statusHistory = item.statusHistory.map(({ status, changedAt, note }) => ({
      status,
      changedAt,
      note,
    }));
    return item;
  });
  res.json({ success: true, orders: visible, total, page, pages: Math.ceil(total / limit) });
};
export const getOrderById = async (req, res) => {
  const id = req.params.id || req.body.orderNumber;
  if (typeof id !== 'string' || id.length > 50) v.fail(404, 'Order not found.');
  const query = id.startsWith('MZH-') ? { orderNumber: id } : { _id: v.objectId(id) };
  const order = await Order.findOne(query).select('+guestTokenHash');
  if (!order) v.fail(404, 'Order not found or tracking key is incorrect.');
  const owner =
    req.user && (req.user.role === 'admin' || String(order.user) === String(req.user._id));
  if (!owner) {
    const provided = req.headers['x-order-token'] || req.body?.trackingToken;
    const digest = typeof provided === 'string' ? hash(provided) : '';
    if (
      order.user ||
      !digest ||
      !order.guestTokenHash ||
      !timingSafeEqual(Buffer.from(digest), Buffer.from(order.guestTokenHash))
    )
      v.fail(404, 'Order not found or tracking key is incorrect.');
  }
  const clean = order.toObject();
  delete clean.guestTokenHash;
  if (req.user?.role !== 'admin')
    clean.statusHistory = clean.statusHistory.map(({ status, changedAt, note }) => ({
      status,
      changedAt,
      note,
    }));
  res.json({ success: true, order: clean });
};
export const transitionOrder = async (req, id, status, note = '') => {
  if (!ORDER_STATUSES.includes(status)) v.fail(400, 'Invalid order status.');
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(v.objectId(id)).session(session);
      if (!order) v.fail(404, 'Order not found.');
      if (
        req.user.role !== 'admin' &&
        (String(order.user) !== String(req.user._id) ||
          order.orderStatus !== 'pending' ||
          status !== 'cancelled')
      )
        v.fail(403, 'Only your pending orders can be cancelled.');
      if (order.orderStatus === status) {
        result = order;
        return;
      }
      if (status === 'cancelled' && order.paymentStatus === 'cash_collected')
        v.fail(409, 'Record the cash reconciliation before cancelling a cash-collected order.');
      if (status === 'cancelled' && order.stockReserved) {
        for (const item of order.items) {
          const restored = await Product.updateOne(
            { _id: item.product, variants: { $elemMatch: { size: item.size, color: item.color } } },
            { $inc: { 'variants.$.stock': item.quantity } },
            { session },
          );
          if (restored.modifiedCount !== 1)
            v.fail(409, 'A reserved variant is missing. Restore the variant before cancelling.');
        }
        order.stockReserved = false;
      }
      if (status !== 'cancelled' && !order.stockReserved) {
        for (const item of order.items) {
          const update = await Product.updateOne(
            {
              _id: item.product,
              isDeleted: false,
              isActive: true,
              variants: {
                $elemMatch: { size: item.size, color: item.color, stock: { $gte: item.quantity } },
              },
            },
            { $inc: { 'variants.$.stock': -item.quantity } },
            { session },
          );
          if (update.modifiedCount !== 1) v.fail(409, 'Not enough stock to reopen this order.');
        }
        order.stockReserved = true;
      }
      order.orderStatus = status;
      order.statusHistory.push(
        history(req, status, v.text(note || 'Status updated', 'note', 1000)),
      );
      await order.save({ session });
      result = order;
    });
  } finally {
    await session.endSession();
  }
  return result;
};
export const cancelOrder = async (req, res) =>
  res.json({
    success: true,
    order: await transitionOrder(
      req,
      req.params.id,
      'cancelled',
      req.body.reason || 'Cancelled by customer',
    ),
  });
export const updateOrderStatus = async (req, res) =>
  res.json({
    success: true,
    order: await transitionOrder(req, req.params.id, req.body.status, req.body.note),
  });
export const updatePaymentStatus = async (req, res) => {
  if (!PAYMENT_STATUSES.includes(req.body.paymentStatus)) v.fail(400, 'Invalid cash status.');
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      order = await Order.findById(v.objectId(req.params.id)).session(session);
      if (!order) v.fail(404, 'Order not found.');
      if (order.orderStatus === 'cancelled' && req.body.paymentStatus === 'cash_collected')
        v.fail(409, 'Cannot collect cash for a cancelled order.');
      order.paymentStatus = req.body.paymentStatus;
      order.statusHistory.push(
        history(req, order.orderStatus, 'Cash status: ' + req.body.paymentStatus),
      );
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }
  res.json({ success: true, order });
};
