import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../server/models/Product.js';
import { getSettings } from '../server/controllers/storeController.js';
try {
  await mongoose.connect(process.env.MONGODB_URI);
  await getSettings();
  if ((await Product.countDocuments()) === 0) {
    const products = [
      'Fringe Jacket',
      'Fur Collar Coat',
      'Scarf Detail Blazer',
      'Wool Overcoat',
      'Suede Jacket',
    ].map((name, i) => ({
      title: name + ' (Sample)',
      description:
        'Sample catalog piece for testing Mazhari. Edit this product in the admin dashboard with your real description, measurements and details.',
      category: ['Fringes', 'Fur', 'Scarf', 'Semi Formal', 'Suede'][i],
      basePrice: [1650, 2200, 1450, 1850, 1750][i],
      material: 'Sample details — update before selling.',
      care: 'Follow the garment care label.',
      featured: i < 2,
      images: [],
      variants: ['Black', 'Rose'].flatMap((color) =>
        ['S', 'M', 'L'].map((size) => ({ color, size, stock: 5 })),
      ),
      colors: ['Black', 'Rose'],
      sizes: ['S', 'M', 'L'],
    }));
    await Product.insertMany(products);
    console.log(
      'Created five clearly labelled sample products. Shipping rates remain unconfigured for the administrator to set.',
    );
  } else console.log('Existing catalog preserved; no demo products added.');
} finally {
  await mongoose.disconnect();
}
