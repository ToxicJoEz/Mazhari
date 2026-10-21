import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB, { checkDBStatus } from './config/db.js';
import { getJWTSecret } from './utils/jwt.js';

// Route Handlers
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';

// Error Handling Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Await MongoDB on every invocation; warm instances reuse the pool.
// Disconnected APIs must never acknowledge mock writes or issue mock sessions.
app.use('/api', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    getJWTSecret();
    const connection = await connectDB();
    if (req.path === '/health') await connection.db.admin().ping();
    next();
  } catch {
    res.status(503).json({ success: false, message: 'Service temporarily unavailable. Please try again shortly.', database: checkDBStatus().state });
  }
});

// API Modules
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const db = checkDBStatus();
  res.status(200).json({
    status: 'ok',
    service: 'Mazhari Luxury E-Commerce API',
    database: db.state,
    timestamp: new Date().toISOString(),
  });
});

// 404 and global error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Backend] Mazhari API server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless function execution
export default app;
