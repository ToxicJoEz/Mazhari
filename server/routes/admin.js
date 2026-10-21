import express from 'express';
import {
  // Password requests & manual reset
  getPasswordRequests,
  fulfillPasswordRequest,
  setUserPasswordManually,
  // User management
  getAllUsers,
  getUserById,
  updateUser,
  banUser,
  unbanUser,
  softDeleteUser,
  restoreUser,
  // Product & Inventory
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  updateProductStock,
  softDeleteProduct,
  restoreProduct,
  uploadImagePlaceholder,
  // Orders & COD
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  // Analytics
  getOverviewMetrics,
} from '../controllers/adminController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict security: ALL admin routes require valid JWT and admin role
router.use(verifyToken, isAdmin);

// ==========================================
// 1. DASHBOARD ANALYTICS
// ==========================================
router.get('/metrics', getOverviewMetrics);

// ==========================================
// 2. PASSWORD RESET NOTIFICATIONS & ACTIONS
// ==========================================
router.get('/password-requests', getPasswordRequests);
router.post('/password-requests/:id/fulfill', fulfillPasswordRequest);
router.post('/users/:id/set-password', setUserPasswordManually);

// ==========================================
// 3. USER MANAGEMENT (ACCOUNTS, BAN, DELETE)
// ==========================================
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.patch('/users/:id/ban', banUser);
router.patch('/users/:id/unban', unbanUser);
router.delete('/users/:id', softDeleteUser);
router.patch('/users/:id/restore', restoreUser);

// ==========================================
// 4. INVENTORY & PRODUCT MANAGEMENT
// ==========================================
router.get('/products', getAllProductsAdmin);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.patch('/products/:id/stock', updateProductStock);
router.delete('/products/:id', softDeleteProduct);
router.patch('/products/:id/restore', restoreProduct);
router.post('/products/upload', uploadImagePlaceholder);

// ==========================================
// 5. ORDER MANAGEMENT & CASH-ON-DELIVERY
// ==========================================
router.get('/orders', getAllOrders);
router.patch('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/payment', updatePaymentStatus);

export default router;
