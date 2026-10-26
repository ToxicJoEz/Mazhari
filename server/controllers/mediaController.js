import { randomUUID } from 'node:crypto';
import Media from '../models/Media.js';
import Product from '../models/Product.js';
import Settings from '../models/Settings.js';
import {
  cloud,
  configured,
  ensurePreset,
  UPLOAD_PRESET,
  MAX_IMAGE_BYTES,
  IMAGE_FORMATS,
} from '../services/cloudinary.js';
import * as v from '../utils/validation.js';
export async function validateMediaUrls(urls) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return;
  if ((await Media.countDocuments({ url: { $in: unique }, status: 'ready' })) !== unique.length)
    v.fail(400, 'Choose an available image from the media library, or upload it first.');
}
export const listMedia = async (req, res) => {
  const { page, limit } = v.pageParams(req.query);
  const q = { status: req.query.status === 'archived' ? 'archived' : 'ready' };
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
    v.fail(400, 'Choose an image up to 20 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(req.body.type))
    v.fail(400, 'Use a JPEG, PNG, WebP, or AVIF image.');
  await ensurePreset();
  const publicId = 'mazhari/' + purpose + '/' + randomUUID();
  const media = await Media.create({ publicId, name, purpose, uploadedBy: req.user._id });
  const params = {
    timestamp: Math.floor(Date.now() / 1000),
    public_id: publicId,
    upload_preset: UPLOAD_PRESET,
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
    !asset.height
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
export const archiveMedia = async (req, res) => {
  const media = await Media.findById(v.objectId(req.params.id));
  if (!media || media.status === 'pending') v.fail(404, 'Image not found.');
  if (req.body.restore === true) media.status = 'ready';
  else {
    const [product, settings] = await Promise.all([
      Product.exists({ images: media.url }),
      Settings.exists({ $or: [{ heroImage: media.url }, { 'collectionCovers.image': media.url }] }),
    ]);
    if (product || settings)
      v.fail(
        409,
        'This image is in use. Remove it from products, banners, and collection covers before archiving.',
      );
    media.status = 'archived';
  }
  await media.save();
  res.json({ success: true, media });
};
