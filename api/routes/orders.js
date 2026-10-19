import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} from '../controllers/orderController.js';
import { verifyToken, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create COD order (guest or authenticated)
router.post('/', optionalAuth, createOrder);

// Customer view their own orders
router.get('/my-orders', verifyToken, getMyOrders);

// View single order (guest with orderNumber, owner, or admin)
router.get('/:id', optionalAuth, getOrderById);

// Cancel order
router.post('/:id/cancel', verifyToken, cancelOrder);

export default router;
