const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Secure all batch routes with auth middleware
router.use(auth);

// GET /api/batches
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

// GET /api/batches/:id
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

// POST /api/batches
router.post('/', async (req, res) => {
  try {
    let { product_name, category, manufacturing_date, shelf_life, expiry_date, quantity, source, batch_details } = req.body;

    // Direct expiry entry fallback: compute shelf life in days if missing
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

    // Make sure alerts are updated for the active user
    if (db.isMock()) {
      db.recalculateMockAlerts(req.user.id);
    } else {
      await db.recalculateMySqlAlerts(req.user.id);
    }

    res.status(201).json(newBatch);
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ message: 'Server error while creating batch' });
  }
});

// PUT /api/batches/:id
router.put('/:id', async (req, res) => {
  try {
    const bId = req.params.id;
    let { product_name, category, manufacturing_date, shelf_life, expiry_date, quantity, source, batch_details } = req.body;

    // Direct expiry entry fallback: compute shelf life in days if missing
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

    const updatedBatch = await db.updateBatch(bId, {
      product_name,
      category,
      manufacturing_date,
      shelf_life: slVal,
      quantity: qtyVal,
      source: source || 'Web Dashboard',
      batch_details: batch_details || ''
    });

    if (!updatedBatch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Make sure alerts are updated for the active user
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

// DELETE /api/batches/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.deleteBatch(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({ message: 'Server error while deleting batch' });
  }
});

module.exports = router;
