import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { checkDBStatus } from '../config/db.js';

/**
 * Get active shopping bag for authenticated user
 * GET /api/cart
 */
export const getCart = async (req, res) => {
  try {
    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        cart: { items: [], total: 0 },
        message: 'Cart retrieved (scaffold mode).',
      });
    }

    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    res.status(200).json({
      success: true,
      cart: {
        id: cart._id,
        items: cart.items,
        subtotal,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shopping bag.',
      error: error.message,
    });
  }
};

/**
 * Add or increment item in shopping bag
 * POST /api/cart/items
 */
export const addItem = async (req, res) => {
  try {
    const { productId, size, color, quantity = 1 } = req.body;

    if (!productId || !size || !color) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, size, and color are required.',
      });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Item added to bag (scaffold mode).',
      });
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false, isActive: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Check variant stock if defined
    const variant = product.variants?.find(
      (v) =>
        v.size.toLowerCase() === size.toLowerCase() &&
        v.color.toLowerCase() === color.toLowerCase()
    );

    if (variant && variant.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${variant.stock} units available in ${size} / ${color}.`,
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size.toLowerCase() === size.toLowerCase() &&
        item.color.toLowerCase() === color.toLowerCase()
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += Number(quantity);
    } else {
      cart.items.push({
        product: product._id,
        title: product.title,
        color,
        size,
        quantity: Number(quantity),
        price: product.basePrice,
        image: product.images[0] || '',
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item added to bag.',
      cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add item to bag.',
      error: error.message,
    });
  }
};

/**
 * Update quantity of a specific item
 * PUT /api/cart/items/:itemId
 */
export const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1.',
      });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Item updated (scaffold mode).',
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in bag.' });
    }

    item.quantity = Number(quantity);
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item quantity updated.',
      cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update item quantity.',
      error: error.message,
    });
  }
};

/**
 * Remove an item from the shopping bag
 * DELETE /api/cart/items/:itemId
 */
export const removeItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Item removed (scaffold mode).',
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from bag.',
      cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove item.',
      error: error.message,
    });
  }
};

/**
 * Empty the shopping bag
 * DELETE /api/cart
 */
export const clearCart = async (req, res) => {
  try {
    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Cart cleared (scaffold mode).',
      });
    }

    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

    res.status(200).json({
      success: true,
      message: 'Shopping bag cleared.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear shopping bag.',
      error: error.message,
    });
  }
};

/**
 * Synchronize guest localStorage bag with user account upon login
 * POST /api/cart/sync
 */
export const syncCart = async (req, res) => {
  try {
    const { guestItems } = req.body;

    if (!Array.isArray(guestItems) || guestItems.length === 0) {
      return res.status(200).json({ success: true, message: 'No items to sync.' });
    }

    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Cart synchronized (scaffold mode).',
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    for (const gItem of guestItems) {
      const idx = cart.items.findIndex(
        (ci) =>
          ci.product.toString() === String(gItem.productId || gItem.id) &&
          ci.size.toLowerCase() === (gItem.size || '').toLowerCase() &&
          ci.color.toLowerCase() === (gItem.color || '').toLowerCase()
      );

      if (idx > -1) {
        cart.items[idx].quantity += Number(gItem.quantity || 1);
      } else {
        cart.items.push({
          product: gItem.productId || gItem.id,
          title: gItem.title || gItem.name,
          color: gItem.color,
          size: gItem.size,
          quantity: Number(gItem.quantity || 1),
          price: Number(gItem.price),
          image: gItem.image || '',
        });
      }
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Shopping bag synchronized with your account.',
      cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to synchronize bag.',
      error: error.message,
    });
  }
};
