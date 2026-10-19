import express from 'express';
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  syncCart,
} from '../controllers/cartController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getCart);
router.post('/items', addItem);
router.put('/items/:itemId', updateItem);
router.delete('/items/:itemId', removeItem);
router.delete('/', clearCart);
router.post('/sync', syncCart);

export default router;
