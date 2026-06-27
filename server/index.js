const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const batchRoutes = require('./routes/batches');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');
const processRoutes = require('./routes/process');
const chatbotRoutes = require('./routes/chatbot');

const app = express();
const PORT = process.env.PORT || 5001;

// Determine allowed origins for CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5001',
  'http://localhost:5173',
  'https://kiranmayee1179.github.io',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl or postman)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      return allowed === origin;
    }) || origin.endsWith('.netlify.app')
      || origin.endsWith('.vercel.app'); // Allow Vercel production + preview deployment URLs

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Logger middleware
app.use(morgan('dev'));

// Parse JSON request bodies
app.use(express.json());

// Routes Mounts
app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/process', processRoutes);
app.use('/api/chatbot', chatbotRoutes);

const path = require('path');
const fs = require('fs');

const clientDistPath = path.join(__dirname, '../client/dist');

// Serve React production build if it exists
if (fs.existsSync(clientDistPath)) {
  console.log(`Serving static production build from: ${clientDistPath}`);
  app.use('/shelf', express.static(clientDistPath));
  app.use(express.static(clientDistPath));

  app.get('/api', (req, res) => {
    const dbStatus = require('./db').isMock() ? 'In-Memory (Mock Fallback)' : 'MySQL (Connected)';
    res.json({
      message: 'Shelf Life & Expiry Reminder System API is active',
      database: dbStatus,
      timestamp: new Date()
    });
  });

  // Client-side routes catch-all
  app.get('/shelf/*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  console.log('No client build found. Running in API-only mode.');
  const healthCheck = (req, res) => {
    const dbStatus = require('./db').isMock() ? 'In-Memory (Mock Fallback)' : 'MySQL (Connected)';
    res.json({
      message: 'Shelf Life & Expiry Reminder System API is active',
      database: dbStatus,
      timestamp: new Date()
    });
  };
  app.get('/', healthCheck);
  app.get('/api', healthCheck);
}

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    message: 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
