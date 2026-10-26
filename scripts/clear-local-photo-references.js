import 'dotenv/config';
import mongoose from 'mongoose';
import { writeFile } from 'node:fs/promises';
import Product from '../server/models/Product.js';
import Settings from '../server/models/Settings.js';
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const products = await Product.find({ images: /^\/images\// })
    .select('title images')
    .lean();
  const settings = await Settings.findById('store').lean();
  if (!process.env.IMAGE_BACKUP_PATH)
    throw new Error('Set IMAGE_BACKUP_PATH before changing image references.');
  await writeFile(
    process.env.IMAGE_BACKUP_PATH,
    JSON.stringify({ products, heroImage: settings?.heroImage }, null, 2),
    { flag: 'wx' },
  );
  let count = 0;
  for (const product of products) {
    const result = await Product.updateOne(
      { _id: product._id, images: product.images },
      { $set: { images: product.images.filter((url) => !url.startsWith('/images/')) } },
    );
    count += result.modifiedCount;
  }
  let banner = 0;
  if (settings?.heroImage?.startsWith('/images/'))
    banner = (
      await Settings.updateOne(
        { _id: 'store', heroImage: settings.heroImage },
        { $set: { heroImage: '' } },
      )
    ).modifiedCount;
  console.log(
    `Cleared local photo references for ${count} products and ${banner} banner. No files were uploaded or deleted; original assets remain available for manual upload.`,
  );
} finally {
  await mongoose.disconnect();
}
