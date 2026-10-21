import Product from '../models/Product.js';
import * as v from '../utils/validation.js';
export const getProducts = async (req, res) => {
  const q = { isDeleted: false, isActive: true };
  const { page, limit } = v.pageParams(req.query);
  for (const key of ['category', 'color', 'size', 'search'])
    if (req.query[key] !== undefined && typeof req.query[key] !== 'string')
      v.fail(400, 'Invalid catalog filter.');
  if (req.query.category) q.category = req.query.category.slice(0, 80);
  if (req.query.search) {
    const regex = new RegExp(v.escapeRegex(req.query.search.slice(0, 100)), 'i');
    q.$or = [{ title: regex }, { description: regex }, { category: regex }];
  }
  const variant = {};
  if (req.query.color) variant.color = req.query.color;
  if (req.query.size) variant.size = req.query.size;
  if (req.query.inStock === 'true') variant.stock = { $gt: 0 };
  if (Object.keys(variant).length) q.variants = { $elemMatch: variant };
  if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
    q.basePrice = {};
    if (req.query.minPrice !== undefined) q.basePrice.$gte = v.amount(req.query.minPrice);
    if (req.query.maxPrice !== undefined) q.basePrice.$lte = v.amount(req.query.maxPrice);
  }
  const sort = {
    price_asc: { basePrice: 1 },
    price_desc: { basePrice: -1 },
    newest: { createdAt: -1 },
  }[req.query.sort] || { featured: -1, createdAt: -1 };
  const [products, total] = await Promise.all([
    Product.find(q)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(q),
  ]);
  res.json({ success: true, products, total, page, pages: Math.ceil(total / limit) });
};
export const getProductById = async (req, res) => {
  const product = await Product.findOne({
    _id: v.objectId(req.params.id),
    isDeleted: false,
    isActive: true,
  });
  if (!product) v.fail(404, 'Product not found.');
  res.json({ success: true, product });
};
export const getCollections = async (req, res) => {
  const products = await Product.find({ isDeleted: false, isActive: true }).select(
    'category colors sizes images',
  );
  res.json({
    success: true,
    collections: [...new Set(products.map((p) => p.category))].sort(),
    colors: [...new Set(products.flatMap((p) => p.colors))].sort(),
    sizes: [...new Set(products.flatMap((p) => p.sizes))],
    covers: Object.fromEntries(
      products.map((p) => [p.category, p.images[0] || '/images/product.svg']),
    ),
  });
};
