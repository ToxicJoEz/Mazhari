import Product from '../models/Product.js';
import { checkDBStatus } from '../config/db.js';

// Fallback seed products for local/scaffold development
const FALLBACK_PRODUCTS = [
  {
    _id: '1',
    id: 1,
    title: 'The Fringe Leather Jacket',
    description: 'Statement fringe jacket tailored from heavyweight hand-selected leather.',
    category: 'Fringes',
    basePrice: 1650,
    shippingFee: 50,
    colors: ['Jet Black', 'Vintage Camel'],
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { color: 'Jet Black', size: 'S', stock: 5 },
      { color: 'Jet Black', size: 'M', stock: 8 },
      { color: 'Jet Black', size: 'L', stock: 4 },
      { color: 'Vintage Camel', size: 'M', stock: 3 },
    ],
    images: ['/src/assets/Fringes jacket1.JPEG', '/src/assets/Fringes jacket2.JPEG'],
    isActive: true,
    isDeleted: false,
  },
  {
    _id: '2',
    id: 2,
    title: 'The Fur Collared Coat',
    description: 'Ultra-luxurious shearling and fur trimmed winter coat.',
    category: 'Fur',
    basePrice: 2200,
    shippingFee: 50,
    colors: ['Chestnut Tan', 'Midnight Noir'],
    sizes: ['S', 'M', 'L'],
    variants: [
      { color: 'Chestnut Tan', size: 'S', stock: 2 },
      { color: 'Chestnut Tan', size: 'M', stock: 5 },
      { color: 'Midnight Noir', size: 'L', stock: 4 },
    ],
    images: ['/src/assets/Fur jacket1.PNG', '/src/assets/Fur jacket2.JPEG'],
    isActive: true,
    isDeleted: false,
  },
  {
    _id: '3',
    id: 3,
    title: 'The Scarf Detail Oversized Blazer',
    description: 'Contemporary structured blazer with integrated draped scarf collar.',
    category: 'Scarf',
    basePrice: 1450,
    shippingFee: 40,
    colors: ['Raw Beige', 'Smoked Espresso'],
    sizes: ['M', 'L'],
    variants: [
      { color: 'Raw Beige', size: 'M', stock: 6 },
      { color: 'Smoked Espresso', size: 'L', stock: 5 },
    ],
    images: ['/src/assets/Scarf jacket1.PNG', '/src/assets/Scarf jacket2.JPEG'],
    isActive: true,
    isDeleted: false,
  },
  {
    _id: '4',
    id: 4,
    title: 'The Semi-Formal Wool Overcoat',
    description: 'Sharp silhouette overcoat crafted from double-faced pure virgin wool.',
    category: 'Semi Formal',
    basePrice: 1850,
    shippingFee: 50,
    colors: ['Charcoal Ash', 'Deep Onyx'],
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { color: 'Charcoal Ash', size: 'M', stock: 10 },
      { color: 'Deep Onyx', size: 'L', stock: 7 },
    ],
    images: ['/src/assets/Simi formal jacket1.PNG', '/src/assets/Simi formal jacket2.PNG'],
    isActive: true,
    isDeleted: false,
  },
  {
    _id: '5',
    id: 5,
    title: 'The Velvet Suede Harrington',
    description: 'Buttery soft suede finish with ribbed trims and antique brass accents.',
    category: 'Suede',
    basePrice: 1750,
    shippingFee: 45,
    colors: ['Dusty Sage', 'Caramel'],
    sizes: ['S', 'M', 'L'],
    variants: [
      { color: 'Dusty Sage', size: 'M', stock: 4 },
      { color: 'Caramel', size: 'L', stock: 3 },
    ],
    images: ['/src/assets/Suede jacket1.JPEG', '/src/assets/Suede jacket2.PNG'],
    isActive: true,
    isDeleted: false,
  },
];

/**
 * Get storefront catalog with rich multi-attribute filters
 * GET /api/products
 * Query Params: category, color, size, minPrice, maxPrice, inStock, search, sort, page, limit
 */
export const getProducts = async (req, res) => {
  try {
    const {
      category,
      color,
      size,
      minPrice,
      maxPrice,
      inStock,
      search,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    const db = checkDBStatus();

    if (!db.isReady) {
      // In-memory filtering on fallback products
      let list = [...FALLBACK_PRODUCTS].filter((p) => !p.isDeleted && p.isActive);

      if (category) {
        list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
      }
      if (color) {
        list = list.filter((p) =>
          p.colors.some((c) => c.toLowerCase().includes(color.toLowerCase()))
        );
      }
      if (size) {
        list = list.filter((p) =>
          p.sizes.some((s) => s.toLowerCase() === size.toLowerCase())
        );
      }
      if (minPrice) {
        list = list.filter((p) => p.basePrice >= Number(minPrice));
      }
      if (maxPrice) {
        list = list.filter((p) => p.basePrice <= Number(maxPrice));
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        );
      }

      if (sort === 'price_asc') {
        list.sort((a, b) => a.basePrice - b.basePrice);
      } else if (sort === 'price_desc') {
        list.sort((a, b) => b.basePrice - a.basePrice);
      }

      return res.status(200).json({
        success: true,
        count: list.length,
        total: list.length,
        page: Number(page),
        products: list,
      });
    }

    // MongoDB query construction
    const query = {
      isDeleted: false,
      isActive: true,
    };

    if (category) {
      query.category = new RegExp(`^${category}$`, 'i');
    }

    if (color) {
      query.colors = { $in: [new RegExp(color, 'i')] };
    }

    if (size) {
      query.sizes = { $in: [new RegExp(`^${size}$`, 'i')] };
    }

    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }

    if (inStock === 'true') {
      query['variants.stock'] = { $gt: 0 };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'price_asc') sortOptions = { basePrice: 1 };
    if (sort === 'price_desc') sortOptions = { basePrice: -1 };
    if (sort === 'newest') sortOptions = { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products.',
      error: error.message,
    });
  }
};

/**
 * Get single product by ID
 * GET /api/products/:id
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = checkDBStatus();

    if (!db.isReady) {
      const found = FALLBACK_PRODUCTS.find((p) => p._id === id || String(p.id) === id);
      if (!found) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }
      return res.status(200).json({ success: true, product: found });
    }

    const product = await Product.findOne({ _id: id, isDeleted: false, isActive: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product.',
      error: error.message,
    });
  }
};

/**
 * Get distinct active categories/collections
 * GET /api/products/collections
 */
export const getCollections = async (req, res) => {
  try {
    const db = checkDBStatus();

    if (!db.isReady) {
      const collections = [...new Set(FALLBACK_PRODUCTS.map((p) => p.category))];
      return res.status(200).json({ success: true, collections });
    }

    const collections = await Product.find({ isDeleted: false, isActive: true }).distinct(
      'category'
    );
    res.status(200).json({ success: true, collections });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve collections.',
      error: error.message,
    });
  }
};
