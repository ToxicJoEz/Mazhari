import { Router } from 'express';
import * as c from '../controllers/productController.js';
import { route } from '../utils/validation.js';
const r = Router();
r.get('/', route(c.getProducts));
r.get('/collections', route(c.getCollections));
r.get('/:id', route(c.getProductById));
export default r;
