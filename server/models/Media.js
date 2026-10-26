import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true },
    url: { type: String, default: '' },
    name: { type: String, required: true },
    purpose: { type: String, enum: ['product', 'banner', 'collection'], default: 'product' },
    status: {
      type: String,
      enum: ['pending', 'ready', 'archived', 'deleting'],
      default: 'pending',
      index: true,
    },
    referenceRevision: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    width: Number,
    height: Number,
    bytes: Number,
    format: String,
  },
  { timestamps: true },
);
export default mongoose.models.Media || mongoose.model('Media', schema);
