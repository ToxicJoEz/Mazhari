import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import { randomUUID } from 'node:crypto';
import Media from '../models/Media.js';
import Product from '../models/Product.js';
import Settings from '../models/Settings.js';
import {
  cloud,
  configured,
  ensurePreset,
  MAX_IMAGE_BYTES,
  IMAGE_FORMATS,
} from '../services/cloudinary.js';
import * as v from '../utils/validation.js';
export const listMedia = async (req, res) => {
  const { page, limit } = v.pageParams(req.query);
  const q =
    req.query.status === 'archived'
      ? {
          $or: [
            { status: { $in: ['archived', 'deleting'] } },
            { status: 'pending', createdAt: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
          ],
        }
      : { status: 'ready' };
  if (req.query.purpose && ['product', 'banner', 'collection'].includes(req.query.purpose))
    q.purpose = req.query.purpose;
  if (req.query.search)
    q.name = new RegExp(v.escapeRegex(String(req.query.search).slice(0, 100)), 'i');
  const [media, total] = await Promise.all([
    Media.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Media.countDocuments(q),
  ]);
  res.json({
    success: true,
    configured: configured(),
    media,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};
export const signUpload = async (req, res) => {
  const purpose = req.body.purpose || 'product';
  if (!['product', 'banner', 'collection'].includes(purpose)) v.fail(400, 'Invalid image purpose.');
  const name = v.text(req.body.name, 'image name', 150);
  if (!Number.isInteger(req.body.size) || req.body.size <= 0 || req.body.size > MAX_IMAGE_BYTES)
    v.fail(400, 'The prepared image must be at most 10 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(req.body.type))
    v.fail(400, 'Use a JPEG, PNG, WebP, or AVIF image.');
  const uploadPreset = await ensurePreset(purpose);
  const publicId = 'mazhari/' + purpose + '/' + randomUUID();
  const media = await Media.create({ publicId, name, purpose, uploadedBy: req.user._id });
  const params = {
    timestamp: Math.floor(Date.now() / 1000),
    public_id: publicId,
    upload_preset: uploadPreset,
    overwrite: false,
  };
  const signature = cloud().utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET.trim(),
  );
  res.json({
    success: true,
    mediaId: media._id,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    apiKey: process.env.CLOUDINARY_API_KEY.trim(),
    params,
    signature,
  });
};
export const completeUpload = async (req, res) => {
  const media = await Media.findOne({ _id: v.objectId(req.params.id), uploadedBy: req.user._id });
  if (!media) v.fail(404, 'Upload not found.');
  if (media.status === 'ready') return res.json({ success: true, media });
  if (media.status !== 'pending' || Date.now() - media.createdAt.getTime() > 2 * 60 * 60 * 1000)
    v.fail(409, 'Upload expired. Please upload the file again.');
  let asset;
  try {
    asset = await cloud().api.resource(media.publicId, { resource_type: 'image', type: 'upload' });
  } catch {
    v.fail(400, 'Upload could not be verified. Wait a moment and retry verification.');
  }
  if (
    asset.public_id !== media.publicId ||
    asset.resource_type !== 'image' ||
    !IMAGE_FORMATS.includes(asset.format) ||
    asset.bytes > MAX_IMAGE_BYTES ||
    !asset.width ||
    !asset.height ||
    asset.width > (media.purpose === 'banner' ? 6000 : 3000) ||
    asset.height > (media.purpose === 'banner' ? 6000 : 3000) ||
    asset.width * asset.height > 24_000_000
  )
    v.fail(400, 'Cloudinary did not return a supported image.');
  const url = cloud().url(asset.public_id, {
    secure: true,
    version: asset.version,
    format: asset.format,
    resource_type: 'image',
  });
  Object.assign(media, {
    status: 'ready',
    url,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    format: asset.format,
  });
  await media.save();
  res.status(201).json({ success: true, media });
};
async function imageInUse(url, session) {
  if (!url) return false;
  for (const query of [
    Product.exists({ images: url }),
    Settings.exists({ $or: [{ heroImage: url }, { 'collectionCovers.image': url }] }),
    Order.exists({ 'items.image': url }),
    Cart.exists({ 'items.image': url }),
  ])
    if (await query.session(session)) return true;
  return false;
}
export async function withMediaReferences(urls, work) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return work(undefined);
  return mongoose.connection.transaction(async (session) => {
    const locked = await Media.updateMany(
      { url: { $in: unique }, status: 'ready' },
      { $inc: { referenceRevision: 1 } },
      { session },
    );
    if (locked.matchedCount !== unique.length)
      v.fail(400, 'Choose an available image from the media library, or upload it first.');
    return work(session);
  });
}
export const archiveMedia = async (req, res) => {
  const media = await mongoose.connection.transaction(async (session) => {
    const image = await Media.findById(v.objectId(req.params.id)).session(session);
    if (!image || !['ready', 'archived'].includes(image.status))
      v.fail(409, 'This image is not available for archive or restore.');
    image.status = req.body.restore === true ? 'ready' : 'archived';
    await image.save({ session });
    if (image.status === 'archived' && (await imageInUse(image.url, session)))
      v.fail(
        409,
        'This image is in use by a product, banner, collection, cart, or past order. Remove its references before archiving.',
      );
    return image;
  });
  res.json({ success: true, media });
};
export const deleteMedia = async (req, res) => {
  const media = await mongoose.connection.transaction(async (session) => {
    const image = await Media.findById(v.objectId(req.params.id)).session(session);
    if (!image) v.fail(404, 'Image not found.');
    const expired =
      image.status === 'pending' && Date.now() - image.createdAt.getTime() > 2 * 60 * 60 * 1000;
    if (!['archived', 'deleting'].includes(image.status) && !expired)
      v.fail(409, 'Archive an unused image before permanently deleting it.');
    image.status = 'deleting';
    await image.save({ session });
    if (await imageInUse(image.url, session))
      v.fail(
        409,
        'This image is still in use by a product, banner, collection, cart, or past order and cannot be deleted.',
      );
    return image;
  });
  try {
    const result = await cloud().uploader.destroy(media.publicId, {
      resource_type: 'image',
      type: 'upload',
      invalidate: true,
    });
    if (!['ok', 'not found', 'not_found'].includes(result.result))
      throw new Error('Deletion not confirmed');
  } catch {
    return res.status(502).json({
      success: false,
      message:
        'Cloudinary could not confirm deletion. This image remains locked; use Retry deletion to finish safely.',
    });
  }
  await Media.deleteOne({ _id: media._id, status: 'deleting' });
  res.json({
    success: true,
    message: 'Image permanently deleted from Cloudinary and the media library.',
  });
};
