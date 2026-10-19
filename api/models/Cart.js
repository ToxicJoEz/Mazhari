import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: { type: String, required: true },
    color: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
  },
  { _id: true }
);

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: [CartItemSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Cart || mongoose.model('Cart', CartSchema);
