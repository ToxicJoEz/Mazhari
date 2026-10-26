import mongoose from 'mongoose';
import { GOVERNORATES } from '../../shared/constants.js';
const schema = new mongoose.Schema(
  {
    _id: { type: String, default: 'store' },
    heroTitle: { type: String, default: 'A different kind of statement.' },
    heroSubtitle: {
      type: String,
      default:
        'Considered silhouettes. Distinctive textures. Discover the Mazhari outerwear collection.',
    },
    heroImage: { type: String, default: '' },
    heroAlt: { type: String, default: 'Mazhari collection' },
    collectionCovers: { type: [{ category: String, image: String, _id: false }], default: [] },
    supportEmail: { type: String, default: '' },
    supportPhone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    announcement: { type: String, default: 'Cash on delivery · Across Egypt · Prices in EGP' },
    shippingRates: {
      type: [
        {
          governorate: String,
          fee: { type: Number, default: null, min: 0 },
          enabled: { type: Boolean, default: true },
          _id: false,
        },
      ],
      default: () => GOVERNORATES.map((governorate) => ({ governorate, fee: null, enabled: true })),
    },
  },
  { timestamps: true },
);
export default mongoose.models.Settings || mongoose.model('Settings', schema);
