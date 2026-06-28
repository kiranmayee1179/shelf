const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Secure all product routes with auth middleware
router.use(auth);

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await db.getAllProducts();
    res.json({
      products,
      totalCount: products.length
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ message: 'Server error while fetching products list' });
  }
});

// POST /api/products/add
router.post('/add', async (req, res) => {
  try {
    const { product_name, category, price, description } = req.body;

    if (!product_name || !category) {
      return res.status(400).json({ message: 'product_name and category are required' });
    }

    // Category validation
    const validCategories = ['Pickle', 'Powder', 'Ready Mix', 'Snacks', 'Appalam', 'Home Made Snacks', 'Vadam', 'Dry Pickle', 'Home Made Ghee', 'Chips'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
    }

    const prcVal = parseFloat(price || 0.00);
    if (isNaN(prcVal) || prcVal < 0) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }

    // Check duplicate product
    const products = await db.getAllProducts();
    const isDuplicate = products.some(p => p.product_name.toLowerCase() === product_name.toLowerCase());
    if (isDuplicate) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    const newProd = await db.createProduct({
      product_name,
      category,
      price: prcVal,
      description: description || ''
    });

    db.logActivity(`Product "${product_name}" added by user "${req.user.fullName || req.user.email}".`, 'success');

    res.status(201).json(newProd);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error while adding product' });
  }
});

module.exports = router;
