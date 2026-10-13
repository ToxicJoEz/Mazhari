import express from 'express';
// import Order from '../models/Order.js'; // Will be used when DB is connected

const router = express.Router();

// GET all orders (For Admin Dashboard)
router.get('/', async (req, res) => {
  try {
    // const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({ message: "Fetch all orders - DB not yet connected" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new order (From Checkout Form)
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;
    // const newOrder = new Order(orderData);
    // await newOrder.save();
    
    // Here we will eventually trigger WhatsApp/Email notification to Admin
    
    res.status(201).json({ message: "Order received successfully", data: orderData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
