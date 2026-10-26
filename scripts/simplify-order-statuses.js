import { orderStatusMigrationPipeline } from '../server/utils/orderStatusMigration.js';
import 'dotenv/config';
import mongoose from 'mongoose';
import { writeFile } from 'node:fs/promises';
import Order from '../server/models/Order.js';
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const query = {
    $or: [
      { orderStatus: { $in: ['confirmed', 'shipped'] } },
      { 'statusHistory.status': { $in: ['confirmed', 'shipped'] } },
    ],
  };
  const affected = await Order.find(query).select('orderStatus statusHistory.status').lean();
  if (affected.length) {
    if (!process.env.STATUS_BACKUP_PATH)
      throw new Error('Set STATUS_BACKUP_PATH before consolidating legacy order states.');
    await writeFile(process.env.STATUS_BACKUP_PATH, JSON.stringify(affected, null, 2), {
      flag: 'wx',
    });
    const result = await Order.updateMany(query, orderStatusMigrationPipeline(), {
      updatePipeline: true,
      timestamps: false,
    });
    console.log('Consolidated legacy order states:', result.modifiedCount);
  } else console.log('No legacy order states need migration.');
} finally {
  await mongoose.disconnect();
}
