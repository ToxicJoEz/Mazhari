import mongoose from 'mongoose';

const ProductVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true },
    size: { type: String, required: true },
    stock: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Product collection/category is required'],
      trim: true,
      index: true,
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price must be positive'],
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    colors: [
      {
        type: String,
        trim: true,
      },
    ],
    sizes: [
      {
        type: String,
        trim: true,
      },
    ],
    variants: [ProductVariantSchema],
    images: [
      {
        type: String,
        required: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast storefront search and filtering
ProductSchema.index({ category: 1, isDeleted: 1, isActive: 1 });
ProductSchema.index({ basePrice: 1 });
ProductSchema.index({ title: 'text', description: 'text' });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
