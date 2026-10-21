import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    title: { type: String, required: true },
    color: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const OrderStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ],
    },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, default: 'system' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      mobile: { type: String, required: true },
      whatsapp: { type: String, default: '' },
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      zip: { type: String, default: '' },
      notes: { type: String, default: '' },
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [(val) => val.length > 0, 'An order must contain at least one item'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: 'Cash on Delivery (COD)',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'cash_collected', 'delivery_failed'],
      default: 'unpaid',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },
    statusHistory: [OrderStatusHistorySchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
