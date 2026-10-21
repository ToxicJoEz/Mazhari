import { createHmac } from 'node:crypto';
import RateLimit from '../models/RateLimit.js';
import { getJWTSecret } from '../utils/jwt.js';
export const rateLimit =
  (namespace, limit = 50) =>
  async (req, res, next) => {
    try {
      const ip = process.env.VERCEL
        ? String(
            req.headers['x-vercel-forwarded-for'] ||
              req.headers['x-forwarded-for'] ||
              req.socket.remoteAddress,
          )
            .split(',')[0]
            .trim()
        : req.socket.remoteAddress;
      const bucket = Math.floor(Date.now() / 900000);
      const id = createHmac('sha256', getJWTSecret())
        .update(namespace + ':' + ip + ':' + bucket)
        .digest('hex');
      const record = await RateLimit.findOneAndUpdate(
        { _id: id },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * 900000) } },
        { upsert: true, returnDocument: 'after' },
      );
      if (record.count > limit) {
        res.set('Retry-After', '900');
        return res.status(429).json({
          success: false,
          message: 'Too many attempts. Please wait 15 minutes before trying again.',
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
