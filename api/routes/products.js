import express from 'express';
import {
  getProducts,
  getProductById,
  getCollections,
} from '../controllers/productController.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/collections', getCollections);
router.get('/:id', getProductById);

export default router;
