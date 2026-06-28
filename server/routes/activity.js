const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Secure all activity routes with auth middleware
router.use(auth);

// GET /api/activity/daily
router.get('/daily', async (req, res) => {
  try {
    const data = await db.getDailyActivity();
    res.json(data);
  } catch (error) {
    console.error('Fetch daily activity error:', error);
    res.status(500).json({ message: 'Server error while fetching daily activity statistics' });
  }
});

// GET /api/activity/users
router.get('/users', async (req, res) => {
  try {
    const data = await db.getUserActivityFeed();
    res.json(data);
  } catch (error) {
    console.error('Fetch user activity feed error:', error);
    res.status(500).json({ message: 'Server error while fetching user activity feed' });
  }
});

// GET /api/activity/devices
router.get('/devices', async (req, res) => {
  try {
    const data = await db.getDeviceTracking();
    res.json(data);
  } catch (error) {
    console.error('Fetch device tracking error:', error);
    res.status(500).json({ message: 'Server error while fetching device tracking statistics' });
  }
});

module.exports = router;
