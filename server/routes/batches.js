const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Secure all batch routes with auth middleware
router.use(auth);

// GET /api/batches (and /api/batch) -> lists all batches
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const batches = await db.getAllBatches(search || '');
    res.json(batches);
  } catch (error) {
    console.error('Fetch batches error:', error);
    res.status(500).json({ message: 'Server error while fetching batches' });
  }
});

// GET /api/batch/all -> returns simple JSON list of batches with days_left & status
router.get('/all', async (req, res) => {
  try {
    const batches = await db.getAllBatches();
    const result = batches.map(b => ({
      product_name: b.product_name,
      batch_number: b.batch_number,
      manufacturing_date: b.manufacturing_date,
      expiry_date: b.expiry_date,
      days_left: b.remaining_days,
      status: b.status
    }));
    res.json(result);
  } catch (error) {
    console.error('Fetch all batches error:', error);
    res.status(500).json({ message: 'Server error while fetching batches list' });
  }
});

// GET /api/batches/:id (and /api/batch/:id) -> fetch single batch
router.get('/:id', async (req, res) => {
  try {
    const batch = await db.getBatchById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    res.json(batch);
  } catch (error) {
    console.error('Fetch batch error:', error);
    res.status(500).json({ message: 'Server error while fetching batch' });
  }
});

// POST /api/batch/add -> normalized batch addition
router.post('/add', async (req, res) => {
  try {
    const { product_id, batch_number, manufacturing_date, expiry_date, quantity } = req.body;
    
    if (!product_id || !manufacturing_date || !expiry_date || quantity === undefined) {
      return res.status(400).json({ message: 'product_id, manufacturing_date, expiry_date, and quantity are required' });
    }

    const qtyVal = parseInt(quantity);
    if (isNaN(qtyVal) || qtyVal < 0) {
      return res.status(400).json({ message: 'Quantity must be a non-negative number' });
    }

    const product = await db.getProductById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newBatch = await db.createBatch({
      product_id,
      batch_number: batch_number || `B-BATCH-${Math.floor(100 + Math.random() * 900)}`,
      manufacturing_date,
      expiry_date,
      quantity: qtyVal
    });

    if (db.isMock()) {
      db.recalculateMockAlerts(req.user.id);
    } else {
      await db.recalculateMySqlAlerts(req.user.id);
    }

    db.logActivity(`Batch "${newBatch.batch_number}" of Product "${product.product_name}" added by user "${req.user.fullName || req.user.email}".`, 'success');

    res.status(201).json(newBatch);
  } catch (error) {
    console.error('Add batch error:', error);
    res.status(500).json({ message: 'Server error while creating batch' });
  }
});

// POST /api/batches (and /api/batch) -> legacy backwards compatibility
router.post('/', async (req, res) => {
  try {
    let { product_name, category, manufacturing_date, shelf_life, expiry_date, quantity, source, batch_details } = req.body;

    if (manufacturing_date && expiry_date && (!shelf_life || isNaN(parseInt(shelf_life)))) {
      const mfg = new Date(manufacturing_date);
      const exp = new Date(expiry_date);
      if (!isNaN(mfg.getTime()) && !isNaN(exp.getTime())) {
        const diffTime = exp - mfg;
        shelf_life = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    if (!product_name || !category || !manufacturing_date || shelf_life === undefined || quantity === undefined) {
      return res.status(400).json({ message: 'All fields (product_name, category, manufacturing_date, shelf_life/expiry_date, quantity) are required' });
    }

    const slVal = parseInt(shelf_life);
    const qtyVal = parseInt(quantity);

    if (isNaN(slVal) || slVal <= 0) {
      return res.status(400).json({ message: 'Shelf life must be a positive number of days' });
    }

    if (isNaN(qtyVal) || qtyVal < 0) {
      return res.status(400).json({ message: 'Quantity must be a non-negative number' });
    }

    const newBatch = await db.createBatch({
      product_name,
      category,
      manufacturing_date,
      shelf_life: slVal,
      quantity: qtyVal,
      source: source || 'Web Dashboard',
      batch_details: batch_details || ''
    });

    if (db.isMock()) {
      db.recalculateMockAlerts(req.user.id);
    } else {
      await db.recalculateMySqlAlerts(req.user.id);
    }

    db.logActivity(`Batch "${product_name}" (Qty: ${qtyVal}) added by user "${req.user.fullName || req.user.email}".`, 'success');

    res.status(201).json(newBatch);
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ message: 'Server error while creating batch' });
  }
});

// PUT /api/batches/:id (and /api/batch/:id) -> updates batch
router.put('/:id', async (req, res) => {
  try {
    const bId = req.params.id;
    let { product_name, category, manufacturing_date, shelf_life, expiry_date, quantity, source, batch_details, product_id, batch_number } = req.body;

    if (manufacturing_date && expiry_date && (!shelf_life || isNaN(parseInt(shelf_life)))) {
      const mfg = new Date(manufacturing_date);
      const exp = new Date(expiry_date);
      if (!isNaN(mfg.getTime()) && !isNaN(exp.getTime())) {
        const diffTime = exp - mfg;
        shelf_life = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    const slVal = shelf_life ? parseInt(shelf_life) : undefined;
    const qtyVal = quantity !== undefined ? parseInt(quantity) : undefined;

    const updatedBatch = await db.updateBatch(bId, {
      product_name,
      category,
      manufacturing_date,
      shelf_life: slVal,
      expiry_date,
      quantity: qtyVal,
      source: source || 'Web Dashboard',
      batch_details: batch_details || '',
      product_id,
      batch_number
    });

    if (!updatedBatch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    if (db.isMock()) {
      db.recalculateMockAlerts(req.user.id);
    } else {
      await db.recalculateMySqlAlerts(req.user.id);
    }

    res.json(updatedBatch);
  } catch (error) {
    console.error('Update batch error:', error);
    res.status(500).json({ message: 'Server error while updating batch' });
  }
});

// DELETE /api/batches/:id (and /api/batch/:id) -> deletes batch
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.deleteBatch(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    db.logActivity(`Batch ID ${req.params.id} deleted by user "${req.user.fullName || req.user.email}".`, 'warning');

    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({ message: 'Server error while deleting batch' });
  }
});

module.exports = router;
