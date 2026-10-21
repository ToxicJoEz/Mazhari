import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    name: String,
    email: String,
    mobile: String,
    message: String,
    status: { type: String, enum: ['new', 'resolved'], default: 'new' },
  },
  { timestamps: true },
);
export default mongoose.models.Inquiry || mongoose.model('Inquiry', schema);
