import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../server/models/Product.js';
import Settings from '../server/models/Settings.js';
import { BANNER_IMAGE, productGallery } from '../shared/media.js';
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const banner = await Settings.updateOne(
    { _id: 'store', heroImage: '/images/banner.svg' },
    { $set: { heroImage: BANNER_IMAGE } },
  );
  let updated = 0;
  for (const [title, category] of [
    ['Fringe Jacket', 'Fringes'],
    ['Fur Collar Coat', 'Fur'],
    ['Scarf Detail Blazer', 'Scarf'],
    ['Wool Overcoat', 'Semi Formal'],
    ['Suede Jacket', 'Suede'],
  ]) {
    const result = await Product.updateOne(
      { title: title + ' (Sample)', images: ['/images/product.svg'] },
      { $set: { images: productGallery(category) } },
    );
    updated += result.modifiedCount;
  }
  console.log(
    `Updated ${updated} sample product galleries and ${banner.modifiedCount} default banner. Custom images preserved.`,
  );
} finally {
  await mongoose.disconnect();
}
