import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PRODUCT_IMAGES, BANNER_IMAGE } from '../shared/media.js';
const root = new URL('../', import.meta.url);
await mkdir(new URL('public/images/library/', root), { recursive: true });
let total = 0;
for (const image of [{ source: 'banner.jpeg', url: BANNER_IMAGE }, ...PRODUCT_IMAGES]) {
  const source = new URL('src/assets/' + image.source, root);
  const destination = new URL('public' + image.url, root);
  const original = await stat(source);
  const existing = await stat(destination).catch(() => null);
  if (!existing || existing.mtimeMs < original.mtimeMs) {
    await sharp(fileURLToPath(source))
      .rotate()
      .resize({ width: image.url === BANNER_IMAGE ? 1920 : 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(fileURLToPath(destination));
  }
  total += (await stat(destination)).size;
}
console.log(`Prepared 17 store images (${(total / 1024 / 1024).toFixed(2)} MB).`);
