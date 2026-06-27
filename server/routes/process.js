const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/process - Calculate expiry status or trigger sync
router.post('/', async (req, res) => {
  try {
    const { manufacturing_date, shelf_life } = req.body;

    // If inputs are provided, calculate and return status for a single batch input
    if (manufacturing_date && shelf_life !== undefined) {
      const slVal = parseInt(shelf_life);
      if (isNaN(slVal) || slVal <= 0) {
        return res.status(400).json({ message: 'Shelf life must be a positive integer' });
      }

      const mfg = new Date(manufacturing_date);
      if (isNaN(mfg.getTime())) {
        return res.status(400).json({ message: 'Invalid manufacturing date' });
      }

      const expiry = new Date(mfg);
      expiry.setDate(expiry.getDate() + slVal);
      const expiry_date = expiry.toISOString().split('T')[0];

      // Calculate remaining days
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const expNorm = new Date(expiry);
      expNorm.setHours(0, 0, 0, 0);

      const diffTime = expNorm - now;
      const remaining_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status = 'Fresh';
      if (remaining_days < 0) {
        status = 'Expired';
      } else if (remaining_days <= 5) {
        status = 'Near Expiry';
      }

      return res.json({
        expiry_date,
        remaining_days,
        status
      });
    }

    // Otherwise, trigger global recalculation of all batch statuses and alerts
    const updatedBatches = await db.recalculateAllStatuses();
    if (db.isMock()) {
      db.recalculateMockAlerts();
    } else {
      await db.recalculateMySqlAlerts();
    }
    
    return res.json({
      message: 'All batch expiry statuses and alerts recalculated successfully',
      batchesCount: updatedBatches.length
    });

  } catch (error) {
    console.error('Process recalculation error:', error);
    res.status(500).json({ message: 'Server error during process calculation' });
  }
});

module.exports = router;
