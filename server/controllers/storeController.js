import { validateMediaUrls } from './mediaController.js';
import Settings from '../models/Settings.js';
import Inquiry from '../models/Inquiry.js';
import * as v from '../utils/validation.js';
import { GOVERNORATES } from '../../shared/constants.js';
export const getSettings = async () => {
  const existing = await Settings.findById('store');
  if (existing) return existing;
  try {
    return await Settings.create({ _id: 'store' });
  } catch (error) {
    if (error.code === 11000) return Settings.findById('store');
    throw error;
  }
};
export const publicSettings = async (req, res) =>
  res.json({ success: true, settings: await getSettings() });
export const updateSettings = async (req, res) => {
  const settings = await getSettings();
  for (const [key, max] of [
    ['heroTitle', 120],
    ['heroAlt', 200],
    ['heroSubtitle', 400],
    ['announcement', 180],
    ['supportEmail', 254],
    ['supportPhone', 25],
    ['whatsapp', 25],
  ])
    if (req.body[key] !== undefined) settings[key] = v.text(req.body[key], key, max, false);
  if (settings.supportEmail) v.email(settings.supportEmail);
  if (req.body.heroImage !== undefined) settings.heroImage = imageUrl(req.body.heroImage);
  if (req.body.collectionCovers !== undefined) {
    if (!Array.isArray(req.body.collectionCovers) || req.body.collectionCovers.length > 100)
      v.fail(400, 'Use up to 100 collection covers.');
    settings.collectionCovers = req.body.collectionCovers.map((row) => ({
      category: v.text(row.category, 'collection', 80),
      image: imageUrl(row.image),
    }));
    if (
      new Set(settings.collectionCovers.map((row) => row.category)).size !==
      settings.collectionCovers.length
    )
      v.fail(400, 'Each collection can have only one cover.');
  }
  await validateMediaUrls([
    ...(req.body.heroImage !== undefined ? [settings.heroImage] : []),
    ...(req.body.collectionCovers !== undefined
      ? settings.collectionCovers.map((row) => row.image)
      : []),
  ]);
  if (req.body.shippingRates !== undefined) {
    if (
      !Array.isArray(req.body.shippingRates) ||
      req.body.shippingRates.length !== GOVERNORATES.length
    )
      v.fail(400, 'Provide one rate for each governorate.');
    const supplied = req.body.shippingRates;
    settings.shippingRates = GOVERNORATES.map((governorate) => {
      const rows = supplied.filter((r) => r.governorate === governorate);
      if (rows.length !== 1) v.fail(400, 'Governorates must appear exactly once.');
      const row = rows[0];
      return {
        governorate,
        fee: row.fee === null || row.fee === '' ? null : v.amount(row.fee),
        enabled: row.enabled !== false,
      };
    });
  }
  await settings.save();
  res.json({ success: true, settings, message: 'Store settings saved.' });
};
export const imageUrl = (value) => {
  if (!value) return '';
  const result = v.text(value, 'image URL', 1000);
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(result))
    v.fail(400, 'Choose a Cloudinary image from the media library.');
  return result;
};
export const contact = async (req, res) => {
  await Inquiry.create({
    name: v.text(req.body.name, 'name', 100),
    email: v.email(req.body.email),
    mobile: req.body.mobile ? v.phone(req.body.mobile) : '',
    message: v.text(req.body.message, 'message', 3000),
  });
  res.status(201).json({
    success: true,
    message:
      'Your message has been saved in our support inbox. Our team will reply using your contact details.',
  });
};
export const getInquiries = async (req, res) => {
  const { page, limit } = v.pageParams(req.query);
  const query = ['new', 'resolved'].includes(req.query.status) ? { status: req.query.status } : {};
  const [inquiries, total] = await Promise.all([
    Inquiry.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Inquiry.countDocuments(query),
  ]);
  res.json({ success: true, inquiries, total, page, pages: Math.ceil(total / limit) });
};
export const resolveInquiry = async (req, res) => {
  const inquiry = await Inquiry.findByIdAndUpdate(
    v.objectId(req.params.id),
    { $set: { status: 'resolved' } },
    { returnDocument: 'after' },
  );
  if (!inquiry) v.fail(404, 'Message not found.');
  res.json({ success: true, inquiry });
};
