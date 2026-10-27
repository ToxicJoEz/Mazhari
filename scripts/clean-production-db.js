import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../server/models/User.js';
import Product from '../server/models/Product.js';
import Order from '../server/models/Order.js';
import Cart from '../server/models/Cart.js';
import Media from '../server/models/Media.js';
import Inquiry from '../server/models/Inquiry.js';
import PasswordResetRequest from '../server/models/PasswordResetRequest.js';
import RateLimit from '../server/models/RateLimit.js';
import { cloud } from '../server/services/cloudinary.js';

dotenv.config();

async function clean() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);

  // 1. Delete all Orders
  const deletedOrders = await Order.deleteMany({});
  console.log(`Deleted ${deletedOrders.deletedCount} orders.`);

  // 2. Delete all Products
  const deletedProducts = await Product.deleteMany({});
  console.log(`Deleted ${deletedProducts.deletedCount} products.`);

  // 3. Delete all Carts
  const deletedCarts = await Cart.deleteMany({});
  console.log(`Deleted ${deletedCarts.deletedCount} carts.`);

  // 4. Delete all Inquiries
  const deletedInquiries = await Inquiry.deleteMany({});
  console.log(`Deleted ${deletedInquiries.deletedCount} inquiries.`);

  // 5. Delete all Password Reset Requests
  const deletedResets = await PasswordResetRequest.deleteMany({});
  console.log(`Deleted ${deletedResets.deletedCount} password reset requests.`);

  // 6. Delete all Rate Limits
  const deletedLimits = await RateLimit.deleteMany({});
  console.log(`Deleted ${deletedLimits.deletedCount} rate limits.`);

  // 7. Delete test product media from DB & Cloudinary
  const productMedia = await Media.find({ purpose: 'product' });
  for (const m of productMedia) {
    try {
      if (process.env.CLOUDINARY_API_KEY) {
        await cloud().uploader.destroy(m.publicId, { resource_type: 'image', invalidate: true });
      }
    } catch (err) {
      console.warn('Cloudinary destroy note for', m.publicId, err.message);
    }
  }
  const deletedMedia = await Media.deleteMany({ purpose: 'product' });
  console.log(`Deleted ${deletedMedia.deletedCount} test product media (kept homepage banner).`);

  // 8. Delete users except admin and QA test account
  const keptEmails = ['latenightgamer20166@gmail.com', 'mazhari.qa.1792602906210@example.com'];
  const deletedUsers = await User.deleteMany({ email: { $nin: keptEmails } });
  console.log(`Deleted ${deletedUsers.deletedCount} test users.`);

  // 9. Summary of remaining items
  const remainingUsers = await User.find({}).select('name email role');
  console.log('\n--- VERIFICATION ---');
  console.log('Remaining Users:');
  remainingUsers.forEach((u) => console.log(`  - ${u.name} (${u.email}) [${u.role}]`));

  const remainingProductsCount = await Product.countDocuments();
  console.log(`Remaining Products: ${remainingProductsCount}`);

  const remainingOrdersCount = await Order.countDocuments();
  console.log(`Remaining Orders: ${remainingOrdersCount}`);

  const remainingCartsCount = await Cart.countDocuments();
  console.log(`Remaining Carts: ${remainingCartsCount}`);

  const remainingMedia = await Media.find({}).select('name purpose');
  console.log('Remaining Media:');
  remainingMedia.forEach((m) => console.log(`  - ${m.name} [${m.purpose}]`));

  await mongoose.disconnect();
}

clean().catch((err) => {
  console.error(err);
  process.exit(1);
});
