import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  whatsapp: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  zip: { type: String, required: true },
  notes: { type: String },
  items: [{
    productId: String,
    name: String,
    size: String,
    quantity: Number,
    price: Number
  }],
  subtotal: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['New', 'Contacted', 'Packing', 'Shipped', 'Delivered'],
    default: 'New'
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
