const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Secure dashboard routes with auth middleware
router.use(auth);

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    // Make sure alerts are updated
    if (db.isMock()) {
      db.recalculateMockAlerts(req.user.id);
    } else {
      await db.recalculateMySqlAlerts(req.user.id);
    }

    const stats = await db.getDashboardStats(req.user.id);
    const charts = await db.getDashboardCharts(req.user.id);
    const recentActivity = await db.getRecentActivities();

    res.json({
      stats,
      charts,
      recentActivity,
      isMock: db.isMock() // Communicate if server is running in-memory or mysql mode
    });
  } catch (error) {
    console.error('Fetch dashboard details error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard statistics' });
  }
});

module.exports = router;
