const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shelf_life_db',
  port: parseInt(process.env.DB_PORT || '3306')
};

let pool = null;
let useMock = false;

// Mock database state
let mockUsers = [];
let mockBatches = [];
let mockActivityLog = [];
let mockAlerts = [];
let mockUserSettings = [];

function logActivity(text, type = 'info') {
  mockActivityLog.unshift({
    id: Date.now() + Math.random().toString(),
    text,
    type,
    created_at: new Date()
  });
  if (mockActivityLog.length > 50) {
    mockActivityLog.pop();
  }
}

// Helper to add/subtract days
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Calculate expiry date and status helper
const calculateExpiryAndStatus = (mfgDateStr, shelfLifeDays) => {
  const mfg = new Date(mfgDateStr);
  const expiry = new Date(mfg);
  expiry.setDate(expiry.getDate() + parseInt(shelfLifeDays));

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expNorm = new Date(expiry);
  expNorm.setHours(0, 0, 0, 0);

  const diffTime = expNorm - now;
  const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let status = 'Fresh';
  if (remainingDays < 0) {
    status = 'Expired';
  } else if (remainingDays <= 5) {
    status = 'Near Expiry';
  }

  return {
    expiry_date: expiry.toISOString().split('T')[0],
    remaining_days: remainingDays,
    status
  };
};

async function seedMockData() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  mockUsers = [
    {
      id: 1,
      full_name: 'Demo Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      created_at: new Date()
    }
  ];

  mockUserSettings = [
    {
      user_id: 1,
      reminder_threshold_days: 5,
      alert_points: '1,3,5'
    }
  ];

  const now = new Date();

  // Create initial batches directly storing product_name and category
  const initialData = [
    { product_name: 'Plain Appalam', category: 'Appalam', daysAgo: -10, shelf_life: 90, quantity: 60 },
    { product_name: 'Plain Appalam', category: 'Appalam', daysAgo: -2, shelf_life: 90, quantity: 40 },
    { product_name: 'Masala Appalam', category: 'Appalam', daysAgo: -5, shelf_life: 90, quantity: 50 },
    { product_name: 'Murukku', category: 'Home Made Snacks', daysAgo: -15, shelf_life: 45, quantity: 60 },
    { product_name: 'Murukku', category: 'Home Made Snacks', daysAgo: -44, shelf_life: 45, quantity: 30 },
    { product_name: 'Mixture', category: 'Home Made Snacks', daysAgo: -12, shelf_life: 45, quantity: 45 },
    { product_name: 'Rice Vadam', category: 'Vadam', daysAgo: -20, shelf_life: 180, quantity: 70 },
    { product_name: 'Color Vadam', category: 'Vadam', daysAgo: -15, shelf_life: 180, quantity: 50 },
    { product_name: 'Mango Pickle', category: 'Dry Pickle', daysAgo: -30, shelf_life: 180, quantity: 50 },
    { product_name: 'Mango Pickle', category: 'Dry Pickle', daysAgo: -178, shelf_life: 180, quantity: 15 },
    { product_name: 'Lemon Pickle', category: 'Dry Pickle', daysAgo: -25, shelf_life: 180, quantity: 40 },
    { product_name: 'Pure Homemade Ghee', category: 'Home Made Ghee', daysAgo: -40, shelf_life: 180, quantity: 20 },
    { product_name: 'Pure Homemade Ghee', category: 'Home Made Ghee', daysAgo: -182, shelf_life: 180, quantity: 5 },
    { product_name: 'Banana Chips', category: 'Chips', daysAgo: -5, shelf_life: 30, quantity: 40 },
    { product_name: 'Banana Chips', category: 'Chips', daysAgo: -29, shelf_life: 30, quantity: 10 },
    { product_name: 'Potato Chips', category: 'Chips', daysAgo: -6, shelf_life: 30, quantity: 30 }
  ];

  mockBatches = initialData.map((item, idx) => {
    const mfgDate = addDays(now, item.daysAgo);
    const { expiry_date, status } = calculateExpiryAndStatus(mfgDate, item.shelf_life);

    return {
      id: idx + 1,
      product_name: item.product_name,
      category: item.category,
      manufacturing_date: mfgDate.toISOString().split('T')[0],
      shelf_life: item.shelf_life,
      expiry_date,
      quantity: item.quantity,
      status,
      source: 'Web Dashboard',
      batch_details: 'Initial inventory load.',
      created_at: new Date()
    };
  });

  logActivity('Mock Database initialized with 6 production batches.', 'info');
  db.recalculateMockAlerts(1);
}

async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    console.log(`Connected to MySQL Server at ${dbConfig.host}:${dbConfig.port}. Ensuring DB "${dbConfig.database}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.end();

    pool = mysql.createPool(dbConfig);
    console.log(`Connection pool established with database "${dbConfig.database}". Running schema updates...`);

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NULL,
        google_id VARCHAR(100) UNIQUE NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clean drop old table or migrate it if it exists with old product_id reference
    try {
      const [columns] = await pool.query("SHOW COLUMNS FROM production_batches LIKE 'product_id'");
      if (columns.length > 0) {
        console.log('Old schema detected. Dropping old production_batches & products tables for refactoring...');
        await pool.query('DROP TABLE IF EXISTS dispatches');
        await pool.query('DROP TABLE IF EXISTS order_items');
        await pool.query('DROP TABLE IF EXISTS orders');
        await pool.query('DROP TABLE IF EXISTS alerts');
        await pool.query('DROP TABLE IF EXISTS inventory');
        await pool.query('DROP TABLE IF EXISTS subscriptions');
        await pool.query('DROP TABLE IF EXISTS followups');
        await pool.query('DROP TABLE IF EXISTS support_tickets');
        await pool.query('DROP TABLE IF EXISTS production_batches');
        await pool.query('DROP TABLE IF EXISTS products');
      }
    } catch (err) {
      // Ignore drop errors if table doesn't exist
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS production_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_name VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL,
        manufacturing_date DATE NOT NULL,
        shelf_life INT NOT NULL,
        expiry_date DATE NOT NULL,
        quantity INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        source VARCHAR(100) DEFAULT 'Web Dashboard',
        batch_details TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dynamically update existing production_batches table columns if they do not exist
    try {
      await pool.query("ALTER TABLE production_batches ADD COLUMN source VARCHAR(100) DEFAULT 'Web Dashboard'");
    } catch (err) {}
    try {
      await pool.query("ALTER TABLE production_batches ADD COLUMN batch_details TEXT NULL");
    } catch (err) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INT PRIMARY KEY,
        reminder_threshold_days INT DEFAULT 5,
        alert_points VARCHAR(100) DEFAULT '1,3,5',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        batch_id INT NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Dynamically update existing alerts table to support user_id if column missing
    try {
      await pool.query("ALTER TABLE alerts ADD COLUMN user_id INT NOT NULL");
      await pool.query("ALTER TABLE alerts ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE");
    } catch (err) {}

    // Seed default admin in MySQL
    const [userRows] = await pool.query('SELECT COUNT(*) AS cnt FROM users');
    let adminUserId = 1;
    if (userRows[0].cnt === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      const [insertRes] = await pool.query(
        'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Demo Admin', 'admin@example.com', hashedPassword, 'admin']
      );
      adminUserId = insertRes.insertId;
      console.log('Seeded default admin account into MySQL (admin@example.com / admin123).');
    } else {
      const [adminUserRows] = await pool.query("SELECT id FROM users WHERE email = 'admin@example.com'");
      if (adminUserRows.length > 0) {
        adminUserId = adminUserRows[0].id;
      }
    }

    // Seed default user settings in MySQL
    const [settingsRows] = await pool.query('SELECT COUNT(*) AS cnt FROM user_settings WHERE user_id = ?', [adminUserId]);
    if (settingsRows[0].cnt === 0) {
      await pool.query(
        'INSERT INTO user_settings (user_id, reminder_threshold_days, alert_points) VALUES (?, ?, ?)',
        [adminUserId, 5, '1,3,5']
      );
    }

    // Migrate database seed data if old categories exist
    try {
      const [oldCatRows] = await pool.query("SELECT COUNT(*) AS cnt FROM production_batches WHERE category IN ('Pickles', 'Snacks', 'Sweets', 'Ghee')");
      const [newCatRows] = await pool.query("SELECT COUNT(*) AS cnt FROM production_batches WHERE category IN ('Appalam', 'Dry Pickle')");
      if (oldCatRows[0].cnt > 0 && newCatRows[0].cnt === 0) {
        console.log('Migrating database seed data for traditional preserved foods categories...');
        await pool.query('DELETE FROM alerts');
        await pool.query('DELETE FROM production_batches');
      }

      // Dynamic cleanup for Vattal category
      const [vattalRows] = await pool.query("SELECT COUNT(*) AS cnt FROM production_batches WHERE category = 'Vattal'");
      if (vattalRows[0].cnt > 0) {
        console.log('Removing obsolete Vattal category batches and alerts...');
        await pool.query("DELETE FROM alerts WHERE batch_id IN (SELECT id FROM production_batches WHERE category = 'Vattal')");
        await pool.query("DELETE FROM production_batches WHERE category = 'Vattal'");
      }
    } catch (err) {
      console.error('Migration check failed:', err.message);
    }

    // Seed default batches if production_batches is empty
    const [batchRows] = await pool.query('SELECT COUNT(*) AS cnt FROM production_batches');
    if (batchRows[0].cnt === 0) {
      const now = new Date();
      const initialData = [
        ['Plain Appalam', 'Appalam', addDays(now, -10), 90, 60],
        ['Plain Appalam', 'Appalam', addDays(now, -2), 90, 40],
        ['Masala Appalam', 'Appalam', addDays(now, -5), 90, 50],
        ['Murukku', 'Home Made Snacks', addDays(now, -15), 45, 60],
        ['Murukku', 'Home Made Snacks', addDays(now, -44), 45, 30],
        ['Mixture', 'Home Made Snacks', addDays(now, -12), 45, 45],
        ['Rice Vadam', 'Vadam', addDays(now, -20), 180, 70],
        ['Color Vadam', 'Vadam', addDays(now, -15), 180, 50],
        ['Mango Pickle', 'Dry Pickle', addDays(now, -30), 180, 50],
        ['Mango Pickle', 'Dry Pickle', addDays(now, -178), 180, 15],
        ['Lemon Pickle', 'Dry Pickle', addDays(now, -25), 180, 40],
        ['Pure Homemade Ghee', 'Home Made Ghee', addDays(now, -40), 180, 20],
        ['Pure Homemade Ghee', 'Home Made Ghee', addDays(now, -182), 180, 5],
        ['Banana Chips', 'Chips', addDays(now, -5), 30, 40],
        ['Banana Chips', 'Chips', addDays(now, -29), 30, 10],
        ['Potato Chips', 'Chips', addDays(now, -6), 30, 30]
      ];

      for (const row of initialData) {
        const [pName, cat, mfgDate, shelfLife, qty] = row;
        const { expiry_date, status } = calculateExpiryAndStatus(mfgDate, shelfLife);
        await pool.query(
          'INSERT INTO production_batches (product_name, category, manufacturing_date, shelf_life, expiry_date, quantity, status, source, batch_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [pName, cat, mfgDate.toISOString().split('T')[0], shelfLife, expiry_date, qty, status, 'Web Dashboard', 'Initial database seed.']
        );
      }
      console.log('Seeded initial production batches into MySQL database.');
    }

    // Initialize alerts for MySQL
    await db.recalculateMySqlAlerts(adminUserId);

    console.log('MySQL Database initialization completed successfully.');
    useMock = false;
  } catch (error) {
    console.error('------------------------------------------------------------');
    console.error('WARNING: Unable to connect to MySQL database server.');
    console.error('Details:', error.message);
    console.error('System will fall back to dynamic IN-MEMORY Database.');
    console.error('No MySQL database installation is required for testing/demo.');
    console.error('------------------------------------------------------------');
    useMock = true;
    await seedMockData();
  }
}

const db = {
  isMock: () => useMock,

  // Users Repository
  getUserById: async (id) => {
    if (useMock) {
      return mockUsers.find(u => u.id === parseInt(id)) || null;
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  getUserByEmail: async (email) => {
    if (useMock) {
      return mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  getUserByGoogleId: async (googleId) => {
    if (useMock) {
      return mockUsers.find(u => u.google_id === googleId) || null;
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
    return rows[0] || null;
  },

  createUser: async ({ fullName, email, password, googleId, role }) => {
    if (useMock) {
      const newUser = {
        id: mockUsers.length + 1,
        full_name: fullName,
        email,
        password,
        google_id: googleId || null,
        role: role || 'user',
        created_at: new Date()
      };
      mockUsers.push(newUser);
      logActivity(`New user account registered for ${fullName} (${email})`, 'info');
      return newUser;
    }
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password, google_id, role) VALUES (?, ?, ?, ?, ?)',
      [fullName, email, password, googleId || null, role || 'user']
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    return rows[0];
  },

  // Recalculate statuses of all batches
  recalculateAllStatuses: async () => {
    if (useMock) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      mockBatches.forEach(b => {
        const exp = new Date(b.expiry_date);
        exp.setHours(0, 0, 0, 0);
        const diffTime = exp - now;
        const rem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (rem < 0) {
          b.status = 'Expired';
        } else if (rem <= 5) {
          b.status = 'Near Expiry';
        } else {
          b.status = 'Fresh';
        }
      });
      return mockBatches;
    }

    // MySQL Flow
    await pool.query(`
      UPDATE production_batches
      SET status = CASE
        WHEN DATEDIFF(expiry_date, CURDATE()) < 0 THEN 'Expired'
        WHEN DATEDIFF(expiry_date, CURDATE()) <= 5 THEN 'Near Expiry'
        ELSE 'Fresh'
      END
    `);
    const [rows] = await pool.query('SELECT * FROM production_batches ORDER BY expiry_date ASC');
    return rows;
  },

  // Batches Repository
  getAllBatches: async (search = '') => {
    // Sync statuses relative to today
    await db.recalculateAllStatuses();

    if (useMock) {
      const list = mockBatches.map(b => {
        const now = new Date();
        now.setHours(0,0,0,0);
        const exp = new Date(b.expiry_date);
        exp.setHours(0,0,0,0);
        const diffTime = exp - now;
        const rem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...b,
          remaining_days: rem,
          // Compatibility fields (fallback aliases)
          batch_number: `B-BATCH-${b.id.toString().padStart(3, '0')}`,
          prepared_date: b.manufacturing_date,
          quantity_produced: b.quantity,
          remaining_quantity: b.quantity
        };
      });

      if (!search) return list;
      const term = search.toLowerCase();
      return list.filter(b =>
        b.product_name.toLowerCase().includes(term) ||
        b.category.toLowerCase().includes(term) ||
        b.batch_number.toLowerCase().includes(term)
      );
    }

    const query = `
      SELECT *, 
             DATEDIFF(expiry_date, CURDATE()) AS remaining_days,
             CONCAT('B-BATCH-', LPAD(id, 3, '0')) AS batch_number,
             manufacturing_date AS prepared_date,
             quantity AS quantity_produced,
             quantity AS remaining_quantity
      FROM production_batches
      WHERE product_name LIKE ? OR category LIKE ? OR CONCAT('B-BATCH-', LPAD(id, 3, '0')) LIKE ?
      ORDER BY expiry_date ASC
    `;
    const term = `%${search}%`;
    const [rows] = await pool.query(query, [term, term, term]);
    return rows;
  },

  getBatchById: async (id) => {
    await db.recalculateAllStatuses();

    if (useMock) {
      const b = mockBatches.find(x => x.id === parseInt(id));
      if (!b) return null;

      const now = new Date();
      now.setHours(0,0,0,0);
      const exp = new Date(b.expiry_date);
      exp.setHours(0,0,0,0);
      const diffTime = exp - now;
      const rem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...b,
        remaining_days: rem,
        batch_number: `B-BATCH-${b.id.toString().padStart(3, '0')}`,
        prepared_date: b.manufacturing_date,
        quantity_produced: b.quantity,
        remaining_quantity: b.quantity
      };
    }

    const query = `
      SELECT *, 
             DATEDIFF(expiry_date, CURDATE()) AS remaining_days,
             CONCAT('B-BATCH-', LPAD(id, 3, '0')) AS batch_number,
             manufacturing_date AS prepared_date,
             quantity AS quantity_produced,
             quantity AS remaining_quantity
      FROM production_batches
      WHERE id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  },

  createBatch: async ({ product_name, category, manufacturing_date, shelf_life, quantity, source, batch_details }) => {
    const { expiry_date, status } = calculateExpiryAndStatus(manufacturing_date, shelf_life);
    const qtyVal = parseInt(quantity);
    const slVal = parseInt(shelf_life);
    const srcVal = source || 'Web Dashboard';
    const detVal = batch_details || '';

    if (useMock) {
      const newId = mockBatches.length > 0 ? Math.max(...mockBatches.map(b => b.id)) + 1 : 1;
      const newBatch = {
        id: newId,
        product_name,
        category,
        manufacturing_date,
        shelf_life: slVal,
        expiry_date,
        quantity: qtyVal,
        status,
        source: srcVal,
        batch_details: detVal,
        created_at: new Date()
      };
      mockBatches.push(newBatch);
      logActivity(`Added new batch for ${product_name} (${qtyVal} units)`, 'success');
      return {
        ...newBatch,
        remaining_days: Math.ceil((new Date(expiry_date) - new Date()) / (1000 * 60 * 60 * 24)),
        batch_number: `B-BATCH-${newId.toString().padStart(3, '0')}`,
        prepared_date: manufacturing_date,
        quantity_produced: qtyVal,
        remaining_quantity: qtyVal
      };
    }

    const [result] = await pool.query(
      'INSERT INTO production_batches (product_name, category, manufacturing_date, shelf_life, expiry_date, quantity, status, source, batch_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [product_name, category, manufacturing_date, slVal, expiry_date, qtyVal, status, srcVal, detVal]
    );

    logActivity(`Added new batch for ${product_name} (${qtyVal} units)`, 'success');
    return await db.getBatchById(result.insertId);
  },

  updateBatch: async (id, { product_name, category, manufacturing_date, shelf_life, quantity, source, batch_details }) => {
    const bId = parseInt(id);
    const { expiry_date, status } = calculateExpiryAndStatus(manufacturing_date, shelf_life);
    const qtyVal = parseInt(quantity);
    const slVal = parseInt(shelf_life);
    const srcVal = source || 'Web Dashboard';
    const detVal = batch_details || '';

    if (useMock) {
      const idx = mockBatches.findIndex(b => b.id === bId);
      if (idx === -1) return null;
      
      mockBatches[idx] = {
        ...mockBatches[idx],
        product_name,
        category,
        manufacturing_date,
        shelf_life: slVal,
        expiry_date,
        quantity: qtyVal,
        status,
        source: srcVal,
        batch_details: detVal
      };

      logActivity(`Updated batch details for ${product_name}`, 'info');
      return await db.getBatchById(bId);
    }

    await pool.query(
      'UPDATE production_batches SET product_name = ?, category = ?, manufacturing_date = ?, shelf_life = ?, expiry_date = ?, quantity = ?, status = ?, source = ?, batch_details = ? WHERE id = ?',
      [product_name, category, manufacturing_date, slVal, expiry_date, qtyVal, status, srcVal, detVal, bId]
    );

    logActivity(`Updated batch details for ${product_name}`, 'info');
    return await db.getBatchById(bId);
  },

  deleteBatch: async (id) => {
    const bId = parseInt(id);
    if (useMock) {
      const idx = mockBatches.findIndex(b => b.id === bId);
      if (idx === -1) return false;
      const pName = mockBatches[idx].product_name;
      mockBatches = mockBatches.filter(b => b.id !== bId);
      logActivity(`Deleted batch for ${pName}`, 'warning');
      return true;
    }

    const [rows] = await pool.query('SELECT product_name FROM production_batches WHERE id = ?', [bId]);
    if (rows.length === 0) return false;
    await pool.query('DELETE FROM production_batches WHERE id = ?', [bId]);
    logActivity(`Deleted batch for ${rows[0].product_name}`, 'warning');
    return true;
  },

  // Dashboard Aggregates
  getDashboardStats: async (userId) => {
    await db.recalculateAllStatuses();
    const batchesList = await db.getAllBatches();

    const totalBatches = batchesList.length;
    const totalStock = batchesList.reduce((sum, b) => sum + b.quantity, 0);

    let threshold = 5;
    if (userId) {
      const settings = await db.getUserSettings(userId);
      threshold = settings.reminder_threshold_days;
    }

    const expired = batchesList.filter(b => b.remaining_days < 0).length;
    const expiringSoon = batchesList.filter(b => b.remaining_days >= 0 && b.remaining_days <= threshold).length;
    const fresh = batchesList.filter(b => b.remaining_days > threshold).length;

    return {
      totalProducts: totalBatches, // backward compatibility mapping
      totalBatches,
      totalStock,
      expiringSoon,
      expired,
      fresh
    };
  },

  getDashboardCharts: async (userId) => {
    const batchesList = await db.getAllBatches();

    // 1. Stock Distribution by Category
    const categoryStock = {};
    batchesList.forEach(b => {
      categoryStock[b.category] = (categoryStock[b.category] || 0) + b.quantity;
    });
    const inventoryDistribution = Object.keys(categoryStock).map(cat => ({
      name: cat,
      value: categoryStock[cat]
    }));

    // 2. Expiry Trends
    let threshold = 5;
    if (userId) {
      const settings = await db.getUserSettings(userId);
      threshold = settings.reminder_threshold_days;
    }

    const trends = [
      { name: 'Expired', count: batchesList.filter(b => b.remaining_days < 0).length },
      { name: `Near Expiry (0-${threshold}d)`, count: batchesList.filter(b => b.remaining_days >= 0 && b.remaining_days <= threshold).length },
      { name: `Fresh (>${threshold}d)`, count: batchesList.filter(b => b.remaining_days > threshold).length }
    ];

    // 3. Static mock wastage for visual presentation
    const monthlyWastage = [
      { name: 'Jan', wastage: 10 },
      { name: 'Feb', wastage: 15 },
      { name: 'Mar', wastage: 5 },
      { name: 'Apr', wastage: 20 },
      { name: 'May', wastage: 8 },
      { name: 'Jun', wastage: 12 }
    ];

    return {
      inventoryDistribution,
      expiryTrends: trends,
      monthlyWastage
    };
  },

  getRecentActivities: async () => {
    if (useMock) {
      return mockActivityLog.slice(0, 10);
    }
    return [
      { id: '1', text: 'Database initialized successfully', type: 'info', created_at: new Date() }
    ];
  },

  // User Settings Repository
  getUserSettings: async (userId) => {
    const uId = parseInt(userId);
    if (useMock) {
      let settings = mockUserSettings.find(s => s.user_id === uId);
      if (!settings) {
        settings = {
          user_id: uId,
          reminder_threshold_days: 5,
          alert_points: '1,3,5'
        };
        mockUserSettings.push(settings);
      }
      return settings;
    }

    const [rows] = await pool.query('SELECT * FROM user_settings WHERE user_id = ?', [uId]);
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO user_settings (user_id, reminder_threshold_days, alert_points) VALUES (?, ?, ?)',
        [uId, 5, '1,3,5']
      );
      return {
        user_id: uId,
        reminder_threshold_days: 5,
        alert_points: '1,3,5'
      };
    }
    return rows[0];
  },

  updateUserSettings: async (userId, { reminder_threshold_days, alert_points }) => {
    const uId = parseInt(userId);
    const threshold = parseInt(reminder_threshold_days);
    const points = alert_points || '1,3,5';

    if (useMock) {
      let settings = mockUserSettings.find(s => s.user_id === uId);
      if (!settings) {
        settings = { user_id: uId };
        mockUserSettings.push(settings);
      }
      settings.reminder_threshold_days = threshold;
      settings.alert_points = points;
      return settings;
    }

    await pool.query(
      'INSERT INTO user_settings (user_id, reminder_threshold_days, alert_points) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reminder_threshold_days = ?, alert_points = ?',
      [uId, threshold, points, threshold, points]
    );
    return {
      user_id: uId,
      reminder_threshold_days: threshold,
      alert_points: points
    };
  },

  // Recalculate Alerts for Mock DB
  recalculateMockAlerts: (userId = 1) => {
    const uId = parseInt(userId);
    let threshold = 5;
    const settings = mockUserSettings.find(s => s.user_id === uId);
    if (settings) {
      threshold = settings.reminder_threshold_days;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const readAlertsMap = {};
    mockAlerts.forEach(a => {
      if (a.is_read && a.user_id === uId) {
        readAlertsMap[`${a.batch_id}-${a.alert_type}`] = true;
      }
    });

    const otherUsersAlerts = mockAlerts.filter(a => a.user_id !== uId);
    const newAlerts = [];

    mockBatches.forEach(b => {
      const exp = new Date(b.expiry_date);
      exp.setHours(0, 0, 0, 0);
      const diffTime = exp - now;
      const rem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const batchNo = b.batch_number || `B-BATCH-${String(b.id).padStart(3, '0')}`;

      let alertType = null;
      let priority = 'Low';
      let msg = '';

      if (rem < 0) {
        alertType = 'expired';
        priority = 'High';
        msg = `Batch ${batchNo} of "${b.product_name}" has expired!`;
      } else if (rem <= threshold) {
        alertType = 'near_expiry';
        if (rem <= 1) {
          priority = 'High';
          msg = `Batch ${batchNo} of "${b.product_name}" expires in ${rem} day(s)!`;
        } else if (rem <= 3) {
          priority = 'Medium';
          msg = `Batch ${batchNo} of "${b.product_name}" expires in ${rem} days.`;
        } else {
          priority = 'Low';
          msg = `Batch ${batchNo} of "${b.product_name}" expires in ${rem} days.`;
        }
      }

      if (alertType) {
        const isRead = !!readAlertsMap[`${b.id}-${alertType}`];
        newAlerts.push({
          id: b.id * 1000 + uId * 10 + 1,
          user_id: uId,
          batch_id: b.id,
          alert_type: alertType,
          priority,
          message: msg,
          is_read: isRead,
          created_at: b.created_at || new Date(),
          product_name: b.product_name,
          category: b.category,
          expiry_date: b.expiry_date,
          current_stock: b.quantity,
          remaining_days: rem,
          batch_number: batchNo
        });
      }

      if (b.quantity <= 15) {
        const stockType = 'low_stock';
        const stockPriority = b.quantity === 0 ? 'High' : (b.quantity <= 5 ? 'Medium' : 'Low');
        const stockMsg = b.quantity === 0 
          ? `Batch ${batchNo} of "${b.product_name}" is out of stock!`
          : `Batch ${batchNo} of "${b.product_name}" has low stock (${b.quantity} remaining).`;

        const isRead = !!readAlertsMap[`${b.id}-${stockType}`];
        newAlerts.push({
          id: b.id * 1000 + uId * 10 + 2,
          user_id: uId,
          batch_id: b.id,
          alert_type: stockType,
          priority: stockPriority,
          message: stockMsg,
          is_read: isRead,
          created_at: b.created_at || new Date(),
          product_name: b.product_name,
          category: b.category,
          expiry_date: b.expiry_date,
          current_stock: b.quantity,
          remaining_days: rem,
          batch_number: batchNo
        });
      }
    });

    mockAlerts = [...otherUsersAlerts, ...newAlerts];
  },

  // Recalculate Alerts for MySQL DB
  recalculateMySqlAlerts: async (userId) => {
    if (!userId) return;
    const uId = parseInt(userId);

    const settings = await db.getUserSettings(uId);
    const threshold = settings.reminder_threshold_days;
    
    const batches = await db.getAllBatches();
    
    const [existingRead] = await pool.query('SELECT batch_id, alert_type FROM alerts WHERE user_id = ? AND is_read = TRUE', [uId]);
    const readAlertsSet = new Set(existingRead.map(row => `${row.batch_id}-${row.alert_type}`));

    await pool.query('DELETE FROM alerts WHERE user_id = ?', [uId]);

    for (const b of batches) {
      const rem = b.remaining_days;

      let alertType = null;
      let priority = 'Low';
      let msg = '';

      if (rem < 0) {
        alertType = 'expired';
        priority = 'High';
        msg = `Batch ${b.batch_number} of "${b.product_name}" has expired!`;
      } else if (rem <= threshold) {
        alertType = 'near_expiry';
        if (rem <= 1) {
          priority = 'High';
          msg = `Batch ${b.batch_number} of "${b.product_name}" expires in ${rem} day(s)!`;
        } else if (rem <= 3) {
          priority = 'Medium';
          msg = `Batch ${b.batch_number} of "${b.product_name}" expires in ${rem} days.`;
        } else {
          priority = 'Low';
          msg = `Batch ${b.batch_number} of "${b.product_name}" expires in ${rem} days.`;
        }
      }

      if (alertType) {
        const isRead = readAlertsSet.has(`${b.id}-${alertType}`) ? 1 : 0;
        await pool.query(
          'INSERT INTO alerts (user_id, batch_id, alert_type, priority, message, is_read) VALUES (?, ?, ?, ?, ?, ?)',
          [uId, b.id, alertType, priority, msg, isRead]
        );
      }

      if (b.quantity <= 15) {
        const stockType = 'low_stock';
        const stockPriority = b.quantity === 0 ? 'High' : (b.quantity <= 5 ? 'Medium' : 'Low');
        const stockMsg = b.quantity === 0
          ? `Batch ${b.batch_number} of "${b.product_name}" is out of stock!`
          : `Batch ${b.batch_number} of "${b.product_name}" has low stock (${b.quantity} remaining).`;

        const isRead = readAlertsSet.has(`${b.id}-${stockType}`) ? 1 : 0;
        await pool.query(
          'INSERT INTO alerts (user_id, batch_id, alert_type, priority, message, is_read) VALUES (?, ?, ?, ?, ?, ?)',
          [uId, b.id, stockType, stockPriority, stockMsg, isRead]
        );
      }
    }
  },

  // Alerts Repository
  getAlerts: async (userId) => {
    if (!userId) return [];
    const uId = parseInt(userId);
    if (useMock) {
      db.recalculateMockAlerts(uId);
      return mockAlerts.filter(a => a.user_id === uId).sort((a, b) => {
        const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    }

    const query = `
      SELECT a.*, b.product_name, b.category, b.expiry_date, b.quantity AS current_stock,
             DATEDIFF(b.expiry_date, CURDATE()) AS remaining_days,
             CONCAT('B-BATCH-', LPAD(b.id, 3, '0')) AS batch_number
      FROM alerts a
      JOIN production_batches b ON a.batch_id = b.id
      WHERE a.user_id = ?
      ORDER BY 
        CASE a.priority
          WHEN 'High' THEN 1
          WHEN 'Medium' THEN 2
          WHEN 'Low' THEN 3
          ELSE 4
        END ASC, 
        a.created_at DESC
    `;
    const [rows] = await pool.query(query, [uId]);
    return rows;
  },

  // Mark all alerts as read
  markAllAlertsAsRead: async (userId) => {
    if (!userId) return false;
    const uId = parseInt(userId);
    if (useMock) {
      mockAlerts.forEach(a => {
        if (a.user_id === uId) a.is_read = true;
      });
      return true;
    }
    await pool.query('UPDATE alerts SET is_read = TRUE WHERE user_id = ?', [uId]);
    return true;
  },

  // Mark specific alert as read
  markAlertAsRead: async (id, userId) => {
    if (!userId) return false;
    const alertId = parseInt(id);
    const uId = parseInt(userId);
    if (useMock) {
      const alert = mockAlerts.find(a => a.id === alertId && a.user_id === uId);
      if (alert) {
        alert.is_read = true;
        return true;
      }
      return false;
    }
    await pool.query('UPDATE alerts SET is_read = TRUE WHERE id = ? AND user_id = ?', [alertId, uId]);
    return true;
  },

  getViewerData: async () => {
    if (useMock) {
      return {
        isMock: true,
        users: mockUsers.map(({ password, ...u }) => u),
        batches: mockBatches,
        alerts: mockAlerts,
        settings: mockUserSettings,
        activityLog: mockActivityLog
      };
    }
    const [users] = await pool.query('SELECT id, full_name, email, role, created_at FROM users');
    const [batches] = await pool.query('SELECT * FROM production_batches');
    const [alerts] = await pool.query('SELECT * FROM alerts');
    const [settings] = await pool.query('SELECT * FROM user_settings');
    return {
      isMock: false,
      users,
      batches: batches.map(b => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const exp = new Date(b.expiry_date);
        exp.setHours(0, 0, 0, 0);
        const diffTime = exp - now;
        const rem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          ...b,
          remaining_days: rem,
          batch_number: `B-BATCH-${b.id.toString().padStart(3, '0')}`,
          prepared_date: b.manufacturing_date,
          quantity_produced: b.quantity,
          remaining_quantity: b.quantity
        };
      }),
      alerts,
      settings,
      activityLog: []
    };
  }
};

// Initialize database at the end of the script after db structure is defined
initializeDatabase();

// Background timer to auto-refresh database alerts every 5 minutes
setInterval(async () => {
  try {
    console.log('Background Expiry & Stock Processor running...');
    if (useMock) {
      mockUsers.forEach(u => db.recalculateMockAlerts(u.id));
    } else {
      const [users] = await pool.query('SELECT id FROM users');
      for (const u of users) {
        await db.recalculateMySqlAlerts(u.id);
      }
    }
  } catch (err) {
    console.error('Background Expiry Processor Error:', err);
  }
}, 5 * 60 * 1000);

module.exports = db;
