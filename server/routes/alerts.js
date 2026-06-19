const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Secure alerts routes with auth middleware
router.use(auth);

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    if (db.isMock()) {
      db.recalculateMockAlerts(req.user.id);
    } else {
      await db.recalculateMySqlAlerts(req.user.id);
    }
    
    const alerts = await db.getAlerts(req.user.id);
    res.json(alerts);
  } catch (error) {
    console.error('Fetch alerts error:', error);
    res.status(500).json({ message: 'Server error while fetching alerts' });
  }
});

// PUT /api/alerts/read-all
router.put('/read-all', async (req, res) => {
  try {
    await db.markAllAlertsAsRead(req.user.id);
    res.json({ message: 'All alerts marked as read' });
  } catch (error) {
    console.error('Mark all alerts read error:', error);
    res.status(500).json({ message: 'Server error while updating alerts' });
  }
});

// PUT /api/alerts/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    const success = await db.markAlertAsRead(req.params.id, req.user.id);
    if (!success) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    console.error('Mark alert read error:', error);
    res.status(500).json({ message: 'Server error while updating alert' });
  }
});

module.exports = router;
