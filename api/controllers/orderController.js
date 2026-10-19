import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { checkDBStatus } from '../config/db.js';

/**
 * Place a new Cash-on-Delivery (COD) Order
 * POST /api/orders
 */
export const createOrder = async (req, res) => {
  try {
    const { customer, shippingAddress, items, shippingFee = 50 } = req.body;

    if (!customer?.name || !customer?.email || !customer?.mobile) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, email, and mobile phone number are required for delivery.',
      });
    }

    if (!shippingAddress?.street || !shippingAddress?.city) {
      return res.status(400).json({
        success: false,
        message: 'Shipping street address and city/governorate are required.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.',
      });
    }

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
    const total = subtotal + Number(shippingFee);

    // Human-friendly luxury order code (e.g. MZH-839201)
    const orderNumber = `MZH-${Math.floor(100000 + Math.random() * 900000)}`;

    const db = checkDBStatus();

    if (!db.isReady) {
      // Scaffold mode mock response
      return res.status(201).json({
        success: true,
        message:
          'Order received successfully (scaffold mode). Our team will contact you via phone/WhatsApp to confirm dispatch.',
        order: {
          orderNumber,
          customer,
          shippingAddress,
          items,
          subtotal,
          shippingFee,
          total,
          paymentMethod: 'Cash on Delivery (COD)',
          paymentStatus: 'unpaid',
          orderStatus: 'pending',
          createdAt: new Date(),
        },
      });
    }

    // Deduct stock if products exist
    for (const item of items) {
      if (item.productId) {
        await Product.findOneAndUpdate(
          {
            _id: item.productId,
            'variants.size': item.size,
            'variants.color': item.color,
          },
          {
            $inc: { 'variants.$.stock': -Number(item.quantity) },
          }
        ).catch(() => {});
      }
    }

    const newOrder = new Order({
      orderNumber,
      user: req.user?._id || null,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        mobile: customer.mobile.trim(),
        whatsapp: customer.whatsapp ? customer.whatsapp.trim() : customer.mobile.trim(),
      },
      shippingAddress: {
        street: shippingAddress.street.trim(),
        city: shippingAddress.city.trim(),
        zip: shippingAddress.zip || '',
        notes: shippingAddress.notes || '',
      },
      items: items.map((i) => ({
        product: i.productId || null,
        title: i.title || i.name,
        color: i.color,
        size: i.size,
        quantity: Number(i.quantity),
        price: Number(i.price),
        image: i.image || '',
      })),
      subtotal,
      shippingFee: Number(shippingFee),
      total,
      paymentMethod: 'Cash on Delivery (COD)',
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      statusHistory: [
        {
          status: 'pending',
          changedAt: new Date(),
          changedBy: req.user ? req.user.email : 'guest',
          note: 'Order placed via Cash on Delivery',
        },
      ],
    });

    await newOrder.save();

    // If logged in, clear their persistent shopping bag
    if (req.user?._id) {
      await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message:
        'Your order has been placed. You will receive a verification call / WhatsApp message before dispatch.',
      order: newOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create order.',
      error: error.message,
    });
  }
};

/**
 * Get authenticated user's order history
 * GET /api/orders/my-orders
 */
export const getMyOrders = async (req, res) => {
  try {
    const db = checkDBStatus();
    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        orders: [],
        message: 'Order history (scaffold mode).',
      });
    }

    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your orders.',
      error: error.message,
    });
  }
};

/**
 * Get single order details by ID or orderNumber
 * GET /api/orders/:id
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        order: { orderNumber: id, orderStatus: 'pending', paymentStatus: 'unpaid' },
      });
    }

    const query = id.startsWith('MZH-') ? { orderNumber: id } : { _id: id };
    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Security: Only order owner or admin can view order details
    if (
      req.user &&
      req.user.role !== 'admin' &&
      order.user &&
      order.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order.',
      });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order.',
      error: error.message,
    });
  }
};

/**
 * Cancel an order (Customer initiated, allowed only if pending or confirmed)
 * POST /api/orders/:id/cancel
 */
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const db = checkDBStatus();

    if (!db.isReady) {
      return res.status(200).json({
        success: true,
        message: 'Order cancelled successfully (scaffold mode).',
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Check ownership
    if (
      req.user.role !== 'admin' &&
      (!order.user || order.user.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own orders.',
      });
    }

    if (order.orderStatus !== 'pending' && order.orderStatus !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already ${order.orderStatus}.`,
      });
    }

    order.orderStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      changedAt: new Date(),
      changedBy: req.user.email,
      note: reason ? `Cancelled by client: ${reason}` : 'Cancelled by client',
    });

    await order.save();

    // Restock items
    for (const item of order.items) {
      if (item.product) {
        await Product.findOneAndUpdate(
          {
            _id: item.product,
            'variants.size': item.size,
            'variants.color': item.color,
          },
          {
            $inc: { 'variants.$.stock': item.quantity },
          }
        ).catch(() => {});
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order has been cancelled successfully.',
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order.',
      error: error.message,
    });
  }
};
