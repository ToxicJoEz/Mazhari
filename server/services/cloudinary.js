import { v2 as cloudinary } from 'cloudinary';
import * as v from '../utils/validation.js';
export const UPLOAD_PRESET = 'mazhari_admin_images_v1';
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
export function configured() {
  return ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].every((key) =>
    Boolean(process.env[key]?.trim()),
  );
}
export function cloud() {
  if (!configured())
    v.fail(
      503,
      'Image uploads are not configured. Add the Cloudinary server environment variables.',
    );
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    secure: true,
    timeout: 15000,
  });
  return cloudinary;
}
let presetPromise, presetCloud;
export async function ensurePreset() {
  const sdk = cloud();
  if (presetCloud !== process.env.CLOUDINARY_CLOUD_NAME) {
    presetPromise = undefined;
    presetCloud = process.env.CLOUDINARY_CLOUD_NAME;
  }
  if (!presetPromise)
    presetPromise = (async () => {
      const options = {
        unsigned: false,
        allowed_formats: IMAGE_FORMATS,
        max_file_size: MAX_IMAGE_BYTES,
        overwrite: false,
        transformation: [{ width: 3000, height: 3000, crop: 'limit' }],
      };
      try {
        await sdk.api.upload_preset(UPLOAD_PRESET);
        await sdk.api.update_upload_preset(UPLOAD_PRESET, options);
      } catch (error) {
        if ((error.http_code || error.error?.http_code) !== 404) throw error;
        await sdk.api.create_upload_preset({ name: UPLOAD_PRESET, ...options });
      }
    })().catch(() => {
      presetPromise = undefined;
      throw new Error('Cloudinary upload configuration is unavailable.');
    });
  await presetPromise;
}
