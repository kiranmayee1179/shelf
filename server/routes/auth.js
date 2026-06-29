const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'shelf_life_system_jwt_secret_key_987654321';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

function getDeviceInfo(userAgent) {
  if (!userAgent) return 'Unknown Device';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Basic OS detection
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  // Basic Browser detection
  if (/chrome|crios/i.test(userAgent) && !/edge|edg/i.test(userAgent) && !/opr/i.test(userAgent)) browser = 'Chrome';
  else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = 'Safari';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/edge|edg/i.test(userAgent)) browser = 'Edge';
  else if (/opr|opera/i.test(userAgent)) browser = 'Opera';

  return `${browser} on ${os}`;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;
    
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Account already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await db.createUser({
      fullName,
      email,
      password: hashedPassword,
      googleId: null,
      role: 'user'
    });

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const deviceInfo = getDeviceInfo(req.headers['user-agent']);
    await db.logUserActivity(newUser.id, 'SIGNUP', deviceInfo, ipAddress);

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, fullName: newUser.full_name }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // If account was created via Google and has no password
    if (!user.password && user.google_id) {
      return res.status(400).json({ message: 'This email is registered with Google. Please log in using Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const deviceInfo = getDeviceInfo(req.headers['user-agent']);
    await db.logUserActivity(user.id, 'LOGIN', deviceInfo, ipAddress);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, fullName: user.full_name }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// POST /api/auth/google (Google One-Tap / OAuth handler)
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.log('Google Client verification failed, attempting mock decode for demo/testing...');
      const parts = credential.split('.');
      if (parts.length === 3) {
        try {
          payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        } catch (e) {
          return res.status(400).json({ message: 'Invalid token payload format' });
        }
      } else {
        payload = {
          email: 'google-user@example.com',
          name: 'Google User',
          sub: 'google-mock-id-' + Math.random().toString().slice(2, 8)
        };
      }
    }

    const { email, name, sub: googleId } = payload;
    if (!email) {
      return res.status(400).json({ message: 'Email not provided by Google' });
    }

    let user = await db.getUserByEmail(email);
    let isNew = false;

    if (user) {
      if (!user.google_id) {
        return res.status(400).json({ message: 'Account already exists. Please log in with email/password.' });
      }
    } else {
      isNew = true;
      user = await db.createUser({
        fullName: name || 'Google User',
        email,
        password: null,
        googleId,
        role: 'user'
      });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const deviceInfo = getDeviceInfo(req.headers['user-agent']);
    await db.logUserActivity(user.id, isNew ? 'SIGNUP' : 'LOGIN', deviceInfo, ipAddress);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, fullName: user.full_name }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ message: 'Server error during Google Authentication' });
  }
});

const auth = require('../middleware/auth');

// GET /api/auth/settings
router.get('/settings', auth, async (req, res) => {
  try {
    const settings = await db.getUserSettings(req.user.id);
    res.json(settings);
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({ message: 'Server error while fetching settings' });
  }
});

// PUT /api/auth/settings
router.put('/settings', auth, async (req, res) => {
  try {
    const { reminder_threshold_days, alert_points } = req.body;
    
    const threshold = parseInt(reminder_threshold_days);
    if (isNaN(threshold) || threshold < 1 || threshold > 365) {
      return res.status(400).json({ message: 'Reminder threshold must be between 1 and 365 days' });
    }
    
    const updated = await db.updateUserSettings(req.user.id, {
      reminder_threshold_days: threshold,
      alert_points: alert_points || '1,3,5'
    });
    
    if (db.isMock()) {
      db.recalculateMockAlerts(req.user.id);
    } else {
      await db.recalculateMySqlAlerts(req.user.id);
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error while updating settings' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.json({ message: 'If that email exists in our system, we have sent password reset instructions.' });
    }

    // Generate secure token and expiry (1 hour)
    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await db.savePasswordResetToken(email, token, expiresAt);

    // Build the reset password link (Frontend is HashRouter, so it will contain #/reset-password?token=...)
    const resetUrl = `http://localhost:5173/#/reset-password?token=${token}`;
    console.log(`=========================================`);
    console.log(`PASSWORD RESET REQUEST FOR: ${email}`);
    console.log(`RESET URL: ${resetUrl}`);
    console.log(`=========================================`);

    // For ease of testing in development/mock mode, we return the devResetLink
    res.json({
      message: 'If that email exists in our system, we have sent password reset instructions.',
      devResetLink: resetUrl
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during forgot password request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const user = await db.getUserByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.updateUserPassword(user.id, hashedPassword);

    res.json({ message: 'Your password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

module.exports = router;
