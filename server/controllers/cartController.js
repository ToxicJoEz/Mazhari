import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import * as v from '../utils/validation.js';
export const normalizeItems = async (items, { session, strict = true } = {}) => {
  if (!Array.isArray(items) || items.length > 60)
    v.fail(400, 'A bag can contain up to 30 different selections.');
  const merged = new Map();
  for (const raw of items) {
    const productId = v.objectId(
      raw.productId || (raw.product?._id || raw.product)?.toString() || raw.id,
    );
    const color = v.text(raw.color, 'color', 80),
      size = v.text(raw.size, 'size', 30),
      qty = v.quantity(raw.quantity);
    const key = productId + '|' + color + '|' + size;
    if (merged.has(key)) {
      const total = merged.get(key).quantity + qty;
      merged.get(key).quantity = strict ? v.quantity(total) : Math.min(total, 50);
    } else merged.set(key, { productId, color, size, quantity: qty });
  }
  if (merged.size > 30) v.fail(400, 'A bag can contain up to 30 different selections.');
  const result = [];
  const warnings = [];
  for (const item of merged.values()) {
    let query = Product.findOne({ _id: item.productId, isActive: true, isDeleted: false });
    if (session) query = query.session(session);
    const product = await query;
    const variant = product?.variants.find((a) => a.size === item.size && a.color === item.color);
    if (!product || !variant || variant.stock < 1) {
      if (strict) v.fail(409, 'One of your selections is no longer available. Refresh your bag.');
      warnings.push('An unavailable selection was removed from your bag.');
      continue;
    }
    let qty = item.quantity;
    if (qty > variant.stock) {
      if (strict)
        v.fail(
          409,
          'Only ' +
            variant.stock +
            ' available for ' +
            product.title +
            ' / ' +
            item.color +
            ' / ' +
            item.size +
            '.',
        );
      qty = Math.min(variant.stock, 50);
      warnings.push('Quantity was adjusted to available stock for ' + product.title + '.');
    }
    result.push({
      product: product._id,
      title: product.title,
      color: item.color,
      size: item.size,
      quantity: qty,
      price: product.basePrice,
      image: product.images[0] || '',
      availableStock: variant.stock,
    });
  }
  return { items: result, warnings };
};
const cartResponse = (cart, items, warnings = []) => ({
  success: true,
  cart: { items: items || cart.items, revision: cart.revision || 0 },
  warnings,
});
export const getCart = async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $setOnInsert: { items: [] } },
    { upsert: true, returnDocument: 'after' },
  );
  const normalized = await normalizeItems(cart.items, { strict: false });
  res.json(cartResponse(cart, normalized.items, normalized.warnings));
};
export const saveCart = async (req, res) => {
  if (!Number.isInteger(req.body.revision) || req.body.revision < 0)
    v.fail(400, 'Cart revision is required.');
  const normalized = await normalizeItems(req.body.items, { strict: false });
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id, revision: req.body.revision },
    { $set: { items: normalized.items }, $inc: { revision: 1 } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!cart) v.fail(409, 'Your bag changed in another session. Reload the bag and try again.');
  res.json(cartResponse(cart, normalized.items, normalized.warnings));
};
export const syncCart = async (req, res) => {
  const key = v.text(req.body.mergeKey, 'bag merge key', 100);
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      let cart = await Cart.findOne({ user: req.user._id }).session(session);
      if (!cart) [cart] = await Cart.create([{ user: req.user._id, items: [] }], { session });
      if (cart.mergeKeys.includes(key)) {
        const n = await normalizeItems(cart.items, { session, strict: false });
        result = cartResponse(cart, n.items, n.warnings);
        return;
      }
      const normalized = await normalizeItems([...cart.items, ...(req.body.guestItems || [])], {
        session,
        strict: false,
      });
      cart.items = normalized.items;
      cart.revision = (cart.revision || 0) + 1;
      cart.mergeKeys = [...cart.mergeKeys.slice(-19), key];
      await cart.save({ session });
      result = cartResponse(cart, normalized.items, normalized.warnings);
    });
  } finally {
    await session.endSession();
  }
  res.json(result);
};
export const clearCart = async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $set: { items: [] }, $inc: { revision: 1 } },
    { returnDocument: 'after' },
  );
  res.json(cartResponse(cart || { items: [], revision: 0 }));
};
