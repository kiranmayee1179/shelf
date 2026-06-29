const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const isAiven = (process.env.DB_HOST || '').includes('aivencloud.com');
const sslConfig = (process.env.DB_SSL === 'true' || isAiven) ? { rejectUnauthorized: false } : undefined;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shelf_life_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  ssl: sslConfig
};

let pool = null;
let useMock = false;

// Mock database state
let mockUsers = [];
let mockProducts = [];
let mockProductBatches = [];
let mockUserActivities = [];
let mockProductActivities = [];
let mockAlerts = [];
let mockUserSettings = [];

const MOCK_DB_FILE = path.join(__dirname, 'mock_db.json');

function saveMockData() {
  if (!useMock) return;
  try {
    const data = {
      mockUsers,
      mockProducts,
      mockProductBatches,
      mockUserActivities,
      mockProductActivities,
      mockAlerts,
      mockUserSettings
    };
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save mock database data:', err);
  }
}

function loadMockData() {
  try {
    if (fs.existsSync(MOCK_DB_FILE)) {
      const content = fs.readFileSync(MOCK_DB_FILE, 'utf8');
      const data = JSON.parse(content);
      mockUsers = data.mockUsers || [];
      mockProducts = data.mockProducts || [];
      mockProductBatches = data.mockProductBatches || [];
      mockUserActivities = data.mockUserActivities || [];
      mockProductActivities = data.mockProductActivities || [];
      mockAlerts = data.mockAlerts || [];
      mockUserSettings = data.mockUserSettings || [];
      console.log(`Mock Database loaded successfully from file: ${MOCK_DB_FILE}`);
      return true;
    }
  } catch (err) {
    console.error('Failed to load mock database data from file:', err);
  }
  return false;
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
  } else if (remainingDays <= 7) {
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
      name: 'Demo Admin',
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

  mockProducts = [
    { id: 1, product_name: 'Plain Appalam', category: 'Appalam', price: 10.00, description: 'Traditional plain appalam' },
    { id: 2, product_name: 'Masala Appalam', category: 'Appalam', price: 12.00, description: 'Spicy masala appalam' },
    { id: 3, product_name: 'Murukku', category: 'Snacks', price: 15.00, description: 'Crispy home made snacks' },
    { id: 4, product_name: 'Mixture', category: 'Snacks', price: 15.00, description: 'Crunchy snack mixture' },
    { id: 5, product_name: 'Rice Vadam', category: 'Ready Mix', price: 20.00, description: 'Crisp rice papads' },
    { id: 6, product_name: 'Color Vadam', category: 'Ready Mix', price: 22.00, description: 'Colorful ready mix papads' },
    { id: 7, product_name: 'Mango Pickle', category: 'Pickle', price: 25.00, description: 'Tangy mango pickle' },
    { id: 8, product_name: 'Lemon Pickle', category: 'Pickle', price: 25.00, description: 'Sour lemon pickle' },
    { id: 9, product_name: 'Pure Homemade Ghee', category: 'Snacks', price: 50.00, description: 'Delicious pure ghee' },
    { id: 10, product_name: 'Banana Chips', category: 'Snacks', price: 18.00, description: 'Crispy banana chips' },
    { id: 11, product_name: 'Potato Chips', category: 'Snacks', price: 18.00, description: 'Classic potato chips' }
  ];

  const now = new Date();
  const initialBatches = [
    { product_id: 1, daysAgo: -10, shelf_life: 90, quantity: 60 },
    { product_id: 1, daysAgo: -2, shelf_life: 90, quantity: 40 },
    { product_id: 2, daysAgo: -5, shelf_life: 90, quantity: 50 },
    { product_id: 3, daysAgo: -15, shelf_life: 45, quantity: 60 },
    { product_id: 3, daysAgo: -44, shelf_life: 45, quantity: 30 },
    { product_id: 4, daysAgo: -12, shelf_life: 45, quantity: 45 },
    { product_id: 5, daysAgo: -20, shelf_life: 180, quantity: 70 },
    { product_id: 6, daysAgo: -15, shelf_life: 180, quantity: 50 },
    { product_id: 7, daysAgo: -30, shelf_life: 180, quantity: 50 },
    { product_id: 7, daysAgo: -178, shelf_life: 180, quantity: 15 },
    { product_id: 8, daysAgo: -25, shelf_life: 180, quantity: 40 },
    { product_id: 9, daysAgo: -40, shelf_life: 180, quantity: 20 },
    { product_id: 9, daysAgo: -182, shelf_life: 180, quantity: 5 },
    { product_id: 10, daysAgo: -5, shelf_life: 30, quantity: 40 },
    { product_id: 10, daysAgo: -29, shelf_life: 30, quantity: 10 },
    { product_id: 11, daysAgo: -6, shelf_life: 30, quantity: 30 }
  ];

  mockProductBatches = initialBatches.map((item, idx) => {
    const mfgDate = addDays(now, item.daysAgo);
    const expiryDate = addDays(mfgDate, item.shelf_life);

    return {
      id: idx + 1,
      product_id: item.product_id,
      batch_number: `B-BATCH-${String(idx + 1).padStart(3, '0')}`,
      manufacturing_date: mfgDate.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      quantity: item.quantity,
      created_at: new Date()
    };
  });

  mockUserActivities = [
    {
      id: 1,
      user_id: 1,
      action_type: 'SIGNUP',
      device_info: 'Chrome on Windows',
      ip_address: '127.0.0.1',
      timestamp: addDays(now, -5)
    },
    {
      id: 2,
      user_id: 1,
      action_type: 'LOGIN',
      device_info: 'Chrome on Windows',
      ip_address: '127.0.0.1',
      timestamp: now
    }
  ];

  db.recalculateMockAlerts(1);
}

let reconnectionInterval = null;

function startReconnectionChecks() {
  if (reconnectionInterval) return;
  console.log('Starting background MySQL reconnection checks...');
  reconnectionInterval = setInterval(async () => {
    if (!useMock) {
      clearInterval(reconnectionInterval);
      reconnectionInterval = null;
      return;
    }
    try {
      console.log('Attempting to reconnect to MySQL database...');
      const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        port: dbConfig.port,
        ssl: dbConfig.ssl
      });
      await connection.end();
      
      console.log('MySQL server detected online! Re-initializing database connection pool...');
      clearInterval(reconnectionInterval);
      reconnectionInterval = null;
      await initializeDatabase();
    } catch (err) {
      console.log('MySQL reconnection attempt failed:', err.message);
    }
  }, 30000); // Check every 30 seconds
}

function handlePoolError(err) {
  if (!useMock && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.message.includes('connect') || err.message.includes('lost') || err.message.includes('closed'))) {
    console.error('MySQL connection error occurred. Falling back to In-Memory mock database...');
    useMock = true;
    if (!loadMockData()) {
      seedMockData().then(() => saveMockData());
    } else {
      saveMockData();
    }
    startReconnectionChecks();
  }
}

async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port,
      ssl: dbConfig.ssl
    });

    console.log(`Connected to MySQL Server at ${dbConfig.host}:${dbConfig.port}. Ensuring DB "${dbConfig.database}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.end();

    const rawPool = mysql.createPool(dbConfig);
    pool = {
      query: async (...args) => {
        try {
          return await rawPool.query(...args);
        } catch (err) {
          handlePoolError(err);
          throw err;
        }
      },
      execute: async (...args) => {
        try {
          return await rawPool.execute(...args);
        } catch (err) {
          handlePoolError(err);
          throw err;
        }
      },
      end: () => rawPool.end()
    };
    console.log(`Connection pool established with database "${dbConfig.database}". Running schema updates...`);

    // Create Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NULL,
        google_id VARCHAR(100) UNIQUE NULL,
        role VARCHAR(50) DEFAULT 'user',
        reset_token VARCHAR(255) NULL,
        reset_token_expires TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if users table needs 'name' column (migration for existing database)
    try {
      const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'name'");
      if (columns.length === 0) {
        console.log("Column 'name' is missing in 'users' table. Migrating 'full_name' to 'name'...");
        await pool.query("ALTER TABLE users ADD COLUMN name VARCHAR(100) NULL");
        
        // Copy values from full_name to name
        try {
          await pool.query("UPDATE users SET name = full_name WHERE name IS NULL");
        } catch (e) {
          // fallback if full_name also doesn't exist
          await pool.query("UPDATE users SET name = 'User' WHERE name IS NULL");
        }
        
        // Make name NOT NULL
        await pool.query("ALTER TABLE users MODIFY COLUMN name VARCHAR(100) NOT NULL");
      }
    } catch (err) {
      console.error("Failed to alter users table for 'name' column:", err.message);
    }

    // Check if users table needs 'reset_token' and 'reset_token_expires' columns
    try {
      const [tokenCol] = await pool.query("SHOW COLUMNS FROM users LIKE 'reset_token'");
      if (tokenCol.length === 0) {
        console.log("Columns 'reset_token' or 'reset_token_expires' are missing in 'users' table. Migrating...");
        await pool.query("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL");
      }
      const [expiresCol] = await pool.query("SHOW COLUMNS FROM users LIKE 'reset_token_expires'");
      if (expiresCol.length === 0) {
        await pool.query("ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP NULL");
      }
    } catch (err) {
      console.error("Failed to alter users table for reset token columns:", err.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        device_info VARCHAR(255) NOT NULL,
        ip_address VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    try {
      await pool.query('CREATE INDEX idx_user_activity_user_id ON user_activity(user_id)');
      await pool.query('CREATE INDEX idx_user_activity_timestamp ON user_activity(timestamp)');
    } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_name VARCHAR(150) NOT NULL UNIQUE,
        category VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        batch_number VARCHAR(50) NOT NULL,
        manufacturing_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    try {
      await pool.query('CREATE INDEX idx_product_batches_product_id ON product_batches(product_id)');
    } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    try {
      await pool.query('CREATE INDEX idx_product_activity_product_id ON product_activity(product_id)');
      await pool.query('CREATE INDEX idx_product_activity_timestamp ON product_activity(timestamp)');
    } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INT PRIMARY KEY,
        reminder_threshold_days INT DEFAULT 5,
        alert_points VARCHAR(100) DEFAULT '1,3,5',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Migration of legacy 'production_batches' table data
    try {
      const [oldTableExists] = await pool.query("SHOW TABLES LIKE 'production_batches'");
      if (oldTableExists.length > 0) {
        console.log('Legacy "production_batches" table found. Migrating data to normalized tables...');
        const [oldBatches] = await pool.query('SELECT * FROM production_batches');
        for (const row of oldBatches) {
          let [prodRows] = await pool.query('SELECT id FROM products WHERE product_name = ?', [row.product_name]);
          let productId;
          if (prodRows.length === 0) {
            const [insertProd] = await pool.query(
              'INSERT INTO products (product_name, category, price, description) VALUES (?, ?, ?, ?)',
              [row.product_name, row.category, 0.00, row.batch_details || 'Migrated product.']
            );
            productId = insertProd.insertId;
          } else {
            productId = prodRows[0].id;
          }

          const batchNum = row.batch_number || `B-BATCH-${String(row.id).padStart(3, '0')}`;
          await pool.query(
            'INSERT INTO product_batches (product_id, batch_number, manufacturing_date, expiry_date, quantity) VALUES (?, ?, ?, ?, ?)',
            [productId, batchNum, row.manufacturing_date, row.expiry_date, row.quantity]
          );
        }
        console.log('Migration complete. Dropping old table production_batches...');
        await pool.query('DROP TABLE IF EXISTS alerts');
        await pool.query('DROP TABLE IF EXISTS production_batches');
      }
    } catch (migError) {
      console.error('Migration error:', migError);
    }

    // Ensure alerts table exists referencing product_batches
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
        FOREIGN KEY (batch_id) REFERENCES product_batches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Seed default admin in MySQL
    const [userRows] = await pool.query('SELECT COUNT(*) AS cnt FROM users');
    let adminUserId = 1;
    if (userRows[0].cnt === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      const [insertRes] = await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
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

    // Seed default products and batches if products table is empty
    const [productCountRows] = await pool.query('SELECT COUNT(*) AS cnt FROM products');
    if (productCountRows[0].cnt === 0) {
      const initialProducts = [
        ['Plain Appalam', 'Appalam', 10.00, 'Traditional plain appalam'],
        ['Masala Appalam', 'Appalam', 12.00, 'Spicy masala appalam'],
        ['Murukku', 'Snacks', 15.00, 'Crispy home made snacks'],
        ['Mixture', 'Snacks', 15.00, 'Crunchy snack mixture'],
        ['Rice Vadam', 'Ready Mix', 20.00, 'Crisp rice papads'],
        ['Color Vadam', 'Ready Mix', 22.00, 'Colorful ready mix papads'],
        ['Mango Pickle', 'Pickle', 25.00, 'Tangy mango pickle'],
        ['Lemon Pickle', 'Pickle', 25.00, 'Sour lemon pickle'],
        ['Pure Homemade Ghee', 'Snacks', 50.00, 'Delicious pure ghee'],
        ['Banana Chips', 'Snacks', 18.00, 'Crispy banana chips'],
        ['Potato Chips', 'Snacks', 18.00, 'Classic potato chips']
      ];

      for (const row of initialProducts) {
        const [pName, cat, price, desc] = row;
        await pool.query(
          'INSERT INTO products (product_name, category, price, description) VALUES (?, ?, ?, ?)',
          [pName, cat, price, desc]
        );
      }

      // Add default batches for products
      const now = new Date();
      const initialBatches = [
        ['Plain Appalam', -10, 90, 60],
        ['Plain Appalam', -2, 90, 40],
        ['Masala Appalam', -5, 90, 50],
        ['Murukku', -15, 45, 60],
        ['Murukku', -44, 45, 30],
        ['Mixture', -12, 45, 45],
        ['Rice Vadam', -20, 180, 70],
        ['Color Vadam', -15, 180, 50],
        ['Mango Pickle', -30, 180, 50],
        ['Mango Pickle', -178, 180, 15],
        ['Lemon Pickle', -25, 180, 40],
        ['Pure Homemade Ghee', -40, 180, 20],
        ['Pure Homemade Ghee', -182, 180, 5],
        ['Banana Chips', -5, 30, 40],
        ['Banana Chips', -29, 30, 10],
        ['Potato Chips', -6, 30, 30]
      ];

      let batchIdx = 1;
      for (const batch of initialBatches) {
        const [prodName, daysAgo, shelfLife, qty] = batch;
        const [prodRows] = await pool.query('SELECT id FROM products WHERE product_name = ?', [prodName]);
        if (prodRows.length > 0) {
          const productId = prodRows[0].id;
          const mfgDate = addDays(now, daysAgo);
          const expiryDate = addDays(mfgDate, shelfLife);
          const batchNum = `B-BATCH-${String(batchIdx++).padStart(3, '0')}`;
          await pool.query(
            'INSERT INTO product_batches (product_id, batch_number, manufacturing_date, expiry_date, quantity) VALUES (?, ?, ?, ?, ?)',
            [productId, batchNum, mfgDate.toISOString().split('T')[0], expiryDate.toISOString().split('T')[0], qty]
          );
        }
      }
      console.log('Seeded default products and batches into MySQL.');
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
    if (!loadMockData()) {
      await seedMockData();
      saveMockData();
    }
    startReconnectionChecks();
  }
}

const db = {
  isMock: () => useMock,

  // Users Repository
  getUserById: async (id) => {
    if (useMock) {
      const u = mockUsers.find(u => u.id === parseInt(id)) || null;
      if (u) {
        u.full_name = u.name; // compatibility mapping
      }
      return u;
    }
    const [rows] = await pool.query('SELECT id, name, name AS full_name, email, password, google_id, role, created_at FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  getUserByEmail: async (email) => {
    if (useMock) {
      const u = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
      if (u) {
        u.full_name = u.name; // compatibility mapping
      }
      return u;
    }
    const [rows] = await pool.query('SELECT id, name, name AS full_name, email, password, google_id, role, created_at FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  getUserByGoogleId: async (googleId) => {
    if (useMock) {
      const u = mockUsers.find(u => u.google_id === googleId) || null;
      if (u) {
        u.full_name = u.name;
      }
      return u;
    }
    const [rows] = await pool.query('SELECT id, name, name AS full_name, email, password, google_id, role, created_at FROM users WHERE google_id = ?', [googleId]);
    return rows[0] || null;
  },

  createUser: async ({ name, fullName, email, password, googleId, role }) => {
    const finalName = name || fullName || 'User';
    if (useMock) {
      const newUser = {
        id: mockUsers.length + 1,
        name: finalName,
        full_name: finalName,
        email,
        password,
        google_id: googleId || null,
        role: role || 'user',
        created_at: new Date()
      };
      mockUsers.push(newUser);
      saveMockData();
      return newUser;
    }
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, google_id, role) VALUES (?, ?, ?, ?, ?)',
      [finalName, email, password, googleId || null, role || 'user']
    );
    return {
      id: result.insertId,
      name: finalName,
      full_name: finalName,
      email,
      password,
      role: role || 'user',
      created_at: new Date()
    };
  },

  savePasswordResetToken: async (email, token, expiresAt) => {
    if (useMock) {
      const u = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (u) {
        u.reset_token = token;
        u.reset_token_expires = expiresAt;
        saveMockData();
        return true;
      }
      return false;
    }
    const [result] = await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE LOWER(email) = LOWER(?)',
      [token, expiresAt, email]
    );
    return result.affectedRows > 0;
  },

  getUserByResetToken: async (token) => {
    if (useMock) {
      const u = mockUsers.find(u => u.reset_token === token);
      if (u) {
        const now = new Date();
        const expires = new Date(u.reset_token_expires);
        if (expires > now) {
          u.full_name = u.name; // compatibility mapping
          return u;
        }
      }
      return null;
    }
    const [rows] = await pool.query(
      'SELECT id, name, name AS full_name, email, password, google_id, role, created_at, reset_token_expires FROM users WHERE reset_token = ?',
      [token]
    );
    if (rows.length > 0) {
      const user = rows[0];
      const now = new Date();
      const expires = new Date(user.reset_token_expires);
      if (expires > now) {
        return user;
      }
    }
    return null;
  },

  updateUserPassword: async (userId, hashedPassword) => {
    const uId = parseInt(userId);
    if (useMock) {
      const u = mockUsers.find(u => u.id === uId);
      if (u) {
        u.password = hashedPassword;
        u.reset_token = null;
        u.reset_token_expires = null;
        saveMockData();
        return true;
      }
      return false;
    }
    const [result] = await pool.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, uId]
    );
    return result.affectedRows > 0;
  },

  logUserActivity: async (userId, actionType, deviceInfo, ipAddress) => {
    const uId = parseInt(userId);
    const action = actionType; // 'LOGIN', 'SIGNUP', 'LOGOUT'
    const device = deviceInfo || 'Unknown';
    const ip = ipAddress || '127.0.0.1';

    if (useMock) {
      const newAct = {
        id: mockUserActivities.length + 1,
        user_id: uId,
        action_type: action,
        device_info: device,
        ip_address: ip,
        timestamp: new Date()
      };
      mockUserActivities.push(newAct);
      saveMockData();
      return newAct;
    }

    const [result] = await pool.query(
      'INSERT INTO user_activity (user_id, action_type, device_info, ip_address) VALUES (?, ?, ?, ?)',
      [uId, action, device, ip]
    );
    return {
      id: result.insertId,
      user_id: uId,
      action_type: action,
      device_info: device,
      ip_address: ip,
      timestamp: new Date()
    };
  },

  // Recalculate statuses of all batches
  recalculateAllStatuses: async () => {
    // Dynamically evaluated, no-op for updates since statuses are calculated on queries
    return await db.getAllBatches();
  },

  // Batches Repository
  getAllBatches: async (search = '') => {
    if (useMock) {
      const list = mockProductBatches.map(pb => {
        const prod = mockProducts.find(p => p.id === pb.product_id) || { product_name: 'Unknown', category: 'Snacks', description: '' };
        const now = new Date();
        now.setHours(0,0,0,0);
        const exp = new Date(pb.expiry_date);
        exp.setHours(0,0,0,0);
        const diffTime = exp - now;
        const rem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = 'Fresh';
        if (rem < 0) status = 'Expired';
        else if (rem <= 7) status = 'Near Expiry';

        return {
          id: pb.id,
          product_id: pb.product_id,
          product_name: prod.product_name,
          category: prod.category,
          manufacturing_date: pb.manufacturing_date,
          shelf_life: Math.ceil((new Date(pb.expiry_date) - new Date(pb.manufacturing_date)) / (1000 * 60 * 60 * 24)),
          expiry_date: pb.expiry_date,
          quantity: pb.quantity,
          status,
          source: 'Web Dashboard',
          batch_details: prod.description || '',
          created_at: pb.created_at,
          remaining_days: rem,
          batch_number: pb.batch_number,
          prepared_date: pb.manufacturing_date,
          quantity_produced: pb.quantity,
          remaining_quantity: pb.quantity
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
      SELECT pb.id, pb.product_id, p.product_name, p.category, pb.manufacturing_date, 
             DATEDIFF(pb.expiry_date, pb.manufacturing_date) AS shelf_life,
             pb.expiry_date, pb.quantity, 
             CASE 
               WHEN DATEDIFF(pb.expiry_date, CURDATE()) < 0 THEN 'Expired'
               WHEN DATEDIFF(pb.expiry_date, CURDATE()) <= 7 THEN 'Near Expiry'
               ELSE 'Fresh'
             END AS status,
             'Web Dashboard' AS source,
             p.description AS batch_details,
             DATEDIFF(pb.expiry_date, CURDATE()) AS remaining_days,
             pb.batch_number,
             pb.manufacturing_date AS prepared_date,
             pb.quantity AS quantity_produced,
             pb.quantity AS remaining_quantity
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.id
      WHERE p.product_name LIKE ? OR p.category LIKE ? OR pb.batch_number LIKE ?
      ORDER BY pb.expiry_date ASC
    `;
    const term = `%${search}%`;
    const [rows] = await pool.query(query, [term, term, term]);
    return rows;
  },

  getBatchById: async (id) => {
    if (useMock) {
      const pb = mockProductBatches.find(x => x.id === parseInt(id));
      if (!pb) return null;
      const prod = mockProducts.find(p => p.id === pb.product_id) || { product_name: 'Unknown', category: 'Snacks', description: '' };
      const now = new Date();
      now.setHours(0,0,0,0);
      const exp = new Date(pb.expiry_date);
      exp.setHours(0,0,0,0);
      const diffTime = exp - now;
      const rem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status = 'Fresh';
      if (rem < 0) status = 'Expired';
      else if (rem <= 7) status = 'Near Expiry';

      return {
        id: pb.id,
        product_id: pb.product_id,
        product_name: prod.product_name,
        category: prod.category,
        manufacturing_date: pb.manufacturing_date,
        shelf_life: Math.ceil((new Date(pb.expiry_date) - new Date(pb.manufacturing_date)) / (1000 * 60 * 60 * 24)),
        expiry_date: pb.expiry_date,
        quantity: pb.quantity,
        status,
        source: 'Web Dashboard',
        batch_details: prod.description || '',
        created_at: pb.created_at,
        remaining_days: rem,
        batch_number: pb.batch_number,
        prepared_date: pb.manufacturing_date,
        quantity_produced: pb.quantity,
        remaining_quantity: pb.quantity
      };
    }

    const query = `
      SELECT pb.id, pb.product_id, p.product_name, p.category, pb.manufacturing_date, 
             DATEDIFF(pb.expiry_date, pb.manufacturing_date) AS shelf_life,
             pb.expiry_date, pb.quantity, 
             CASE 
               WHEN DATEDIFF(pb.expiry_date, CURDATE()) < 0 THEN 'Expired'
               WHEN DATEDIFF(pb.expiry_date, CURDATE()) <= 7 THEN 'Near Expiry'
               ELSE 'Fresh'
             END AS status,
             'Web Dashboard' AS source,
             p.description AS batch_details,
             DATEDIFF(pb.expiry_date, CURDATE()) AS remaining_days,
             pb.batch_number,
             pb.manufacturing_date AS prepared_date,
             pb.quantity AS quantity_produced,
             pb.quantity AS remaining_quantity
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.id
      WHERE pb.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  },

  createBatch: async (data) => {
    let {
      product_id,
      batch_number,
      product_name,
      category,
      manufacturing_date,
      shelf_life,
      expiry_date,
      quantity
    } = data;

    let pId = product_id ? parseInt(product_id) : null;
    const qtyVal = parseInt(quantity);
    let finalMfg = manufacturing_date;
    let finalExp = expiry_date;

    // Resolve product name and category if product_id is not provided
    if (!pId && product_name) {
      if (useMock) {
        let prod = mockProducts.find(p => p.product_name.toLowerCase() === product_name.toLowerCase());
        if (!prod) {
          const newPId = mockProducts.length > 0 ? Math.max(...mockProducts.map(p => p.id)) + 1 : 1;
          prod = {
            id: newPId,
            product_name,
            category: category || 'Snacks',
            price: 0.00,
            description: 'Created automatically on batch insert.'
          };
          mockProducts.push(prod);
          // log product activity
          mockProductActivities.push({
            id: mockProductActivities.length + 1,
            product_id: newPId,
            action: 'ADDED',
            timestamp: new Date()
          });
        }
        pId = prod.id;
      } else {
        let [prodRows] = await pool.query('SELECT id FROM products WHERE product_name = ?', [product_name]);
        if (prodRows.length === 0) {
          const [insertProd] = await pool.query(
            'INSERT INTO products (product_name, category, price, description) VALUES (?, ?, ?, ?)',
            [product_name, category || 'Snacks', 0.00, 'Created automatically on batch insert.']
          );
          pId = insertProd.insertId;
          // log product activity
          await pool.query('INSERT INTO product_activity (product_id, action) VALUES (?, ?)', [pId, 'ADDED']);
        } else {
          pId = prodRows[0].id;
        }
      }
    }

    // Calculate expiry_date or shelf_life
    if (finalMfg && !finalExp && shelf_life) {
      const { expiry_date: calculatedExp } = calculateExpiryAndStatus(finalMfg, shelf_life);
      finalExp = calculatedExp;
    }

    // Generate batch number if missing
    if (!batch_number) {
      const rand = Math.floor(100 + Math.random() * 900);
      batch_number = `B-BATCH-${rand}`;
    }

    if (useMock) {
      const newId = mockProductBatches.length > 0 ? Math.max(...mockProductBatches.map(b => b.id)) + 1 : 1;
      const newBatch = {
        id: newId,
        product_id: pId,
        batch_number,
        manufacturing_date: finalMfg,
        expiry_date: finalExp,
        quantity: qtyVal,
        created_at: new Date()
      };
      mockProductBatches.push(newBatch);
      saveMockData();
      return await db.getBatchById(newId);
    }

    const [result] = await pool.query(
      'INSERT INTO product_batches (product_id, batch_number, manufacturing_date, expiry_date, quantity) VALUES (?, ?, ?, ?, ?)',
      [pId, batch_number, finalMfg, finalExp, qtyVal]
    );
    return await db.getBatchById(result.insertId);
  },

  updateBatch: async (id, data) => {
    const bId = parseInt(id);
    let { product_name, category, manufacturing_date, shelf_life, expiry_date, quantity, product_id, batch_number } = data;
    
    // Find existing batch first
    const existing = await db.getBatchById(bId);
    if (!existing) return null;

    let pId = product_id ? parseInt(product_id) : existing.product_id;
    const finalMfg = manufacturing_date || existing.manufacturing_date;
    let finalExp = expiry_date || existing.expiry_date;
    const finalQty = quantity !== undefined ? parseInt(quantity) : existing.quantity;
    const finalBatchNo = batch_number || existing.batch_number;

    if (manufacturing_date && !expiry_date && shelf_life) {
      const { expiry_date: calculatedExp } = calculateExpiryAndStatus(finalMfg, shelf_life);
      finalExp = calculatedExp;
    }

    if (useMock) {
      const idx = mockProductBatches.findIndex(b => b.id === bId);
      if (idx === -1) return null;
      
      mockProductBatches[idx] = {
        ...mockProductBatches[idx],
        product_id: pId,
        batch_number: finalBatchNo,
        manufacturing_date: finalMfg,
        expiry_date: finalExp,
        quantity: finalQty
      };
      saveMockData();
      return await db.getBatchById(bId);
    }

    await pool.query(
      'UPDATE product_batches SET product_id = ?, batch_number = ?, manufacturing_date = ?, expiry_date = ?, quantity = ? WHERE id = ?',
      [pId, finalBatchNo, finalMfg, finalExp, finalQty, bId]
    );
    return await db.getBatchById(bId);
  },

  deleteBatch: async (id) => {
    const bId = parseInt(id);
    if (useMock) {
      const idx = mockProductBatches.findIndex(b => b.id === bId);
      if (idx === -1) return false;
      mockProductBatches = mockProductBatches.filter(b => b.id !== bId);
      saveMockData();
      return true;
    }

    const [rows] = await pool.query('SELECT id FROM product_batches WHERE id = ?', [bId]);
    if (rows.length === 0) return false;
    await pool.query('DELETE FROM product_batches WHERE id = ?', [bId]);
    return true;
  },

  // Products Repository
  getAllProducts: async () => {
    if (useMock) {
      return mockProducts;
    }
    const [rows] = await pool.query('SELECT * FROM products ORDER BY product_name ASC');
    return rows;
  },

  getProductById: async (id) => {
    if (useMock) {
      return mockProducts.find(p => p.id === parseInt(id)) || null;
    }
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    return rows[0] || null;
  },

  createProduct: async ({ product_name, category, price, description }) => {
    const prc = parseFloat(price || 0.00);
    if (useMock) {
      const newId = mockProducts.length > 0 ? Math.max(...mockProducts.map(p => p.id)) + 1 : 1;
      const newProd = {
        id: newId,
        product_name,
        category,
        price: prc,
        description: description || '',
        created_at: new Date()
      };
      mockProducts.push(newProd);
      mockProductActivities.push({
        id: mockProductActivities.length + 1,
        product_id: newId,
        action: 'ADDED',
        timestamp: new Date()
      });
      saveMockData();
      return newProd;
    }

    const [result] = await pool.query(
      'INSERT INTO products (product_name, category, price, description) VALUES (?, ?, ?, ?)',
      [product_name, category, prc, description || '']
    );
    const pId = result.insertId;
    await pool.query('INSERT INTO product_activity (product_id, action) VALUES (?, ?)', [pId, 'ADDED']);
    return await db.getProductById(pId);
  },

  // User Activities
  getDailyActivity: async () => {
    if (useMock) {
      const groups = {};
      mockUserActivities.forEach(act => {
        const dateStr = new Date(act.timestamp).toISOString().split('T')[0];
        if (!groups[dateStr]) {
          groups[dateStr] = { date: dateStr, logins: 0, signups: 0 };
        }
        if (act.action_type === 'LOGIN') groups[dateStr].logins++;
        else if (act.action_type === 'SIGNUP') groups[dateStr].signups++;
      });
      return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }

    const query = `
      SELECT DATE(timestamp) AS date,
             SUM(CASE WHEN action_type = 'LOGIN' THEN 1 ELSE 0 END) AS logins,
             SUM(CASE WHEN action_type = 'SIGNUP' THEN 1 ELSE 0 END) AS signups
      FROM user_activity
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  getUserActivityFeed: async () => {
    if (useMock) {
      return mockUserActivities.map(act => {
        const user = mockUsers.find(u => u.id === act.user_id) || { name: 'Unknown User' };
        return {
          id: act.id,
          name: user.name,
          action: act.action_type,
          timestamp: act.timestamp,
          device_info: act.device_info,
          ip_address: act.ip_address
        };
      }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);
    }

    const query = `
      SELECT ua.id, u.name, ua.action_type AS action, ua.timestamp, ua.device_info, ua.ip_address
      FROM user_activity ua
      JOIN users u ON ua.user_id = u.id
      ORDER BY ua.timestamp DESC
      LIMIT 50
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  getDeviceTracking: async () => {
    if (useMock) {
      const counts = {};
      mockUserActivities.forEach(act => {
        counts[act.device_info] = (counts[act.device_info] || 0) + 1;
      });
      return Object.keys(counts).map(device => ({
        device_info: device,
        count: counts[device]
      })).sort((a, b) => b.count - a.count);
    }

    const query = `
      SELECT device_info, COUNT(*) AS count
      FROM user_activity
      GROUP BY device_info
      ORDER BY count DESC
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  // Dashboard Aggregates
  getDashboardStats: async (userId) => {
    const batchesList = await db.getAllBatches();
    const totalBatches = batchesList.length;
    const totalStock = batchesList.reduce((sum, b) => sum + b.quantity, 0);

    let threshold = 7; // Set to 7 days as requested in specification
    if (userId) {
      const settings = await db.getUserSettings(userId);
      threshold = settings.reminder_threshold_days || 7;
    }

    const expired = batchesList.filter(b => b.remaining_days < 0).length;
    const expiringSoon = batchesList.filter(b => b.remaining_days >= 0 && b.remaining_days <= threshold).length;
    const fresh = batchesList.filter(b => b.remaining_days > threshold).length;

    return {
      totalProducts: totalBatches,
      totalBatches,
      totalStock,
      expiringSoon,
      expired,
      fresh
    };
  },

  getDashboardCharts: async (userId) => {
    const batchesList = await db.getAllBatches();

    const categoryStock = {};
    batchesList.forEach(b => {
      categoryStock[b.category] = (categoryStock[b.category] || 0) + b.quantity;
    });
    const inventoryDistribution = Object.keys(categoryStock).map(cat => ({
      name: cat,
      value: categoryStock[cat]
    }));

    let threshold = 7;
    if (userId) {
      const settings = await db.getUserSettings(userId);
      threshold = settings.reminder_threshold_days || 7;
    }

    const trends = [
      { name: 'Expired', count: batchesList.filter(b => b.remaining_days < 0).length },
      { name: `Near Expiry (0-${threshold}d)`, count: batchesList.filter(b => b.remaining_days >= 0 && b.remaining_days <= threshold).length },
      { name: `Fresh (>${threshold}d)`, count: batchesList.filter(b => b.remaining_days > threshold).length }
    ];

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

  logActivity: (text, type = 'info') => {
    console.log(`[Activity Log] Type: ${type} - ${text}`);
  },

  getRecentActivities: async () => {
    return await db.getUserActivityFeed();
  },

  // User Settings Repository
  getUserSettings: async (userId) => {
    const uId = parseInt(userId);
    if (useMock) {
      let settings = mockUserSettings.find(s => s.user_id === uId);
      if (!settings) {
        settings = {
          user_id: uId,
          reminder_threshold_days: 7,
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
        [uId, 7, '1,3,5']
      );
      return {
        user_id: uId,
        reminder_threshold_days: 7,
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
      saveMockData();
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
    let threshold = 7;
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

    mockProductBatches.forEach(pb => {
      const prod = mockProducts.find(p => p.id === pb.product_id) || { product_name: 'Unknown', category: 'Snacks' };
      const exp = new Date(pb.expiry_date);
      exp.setHours(0, 0, 0, 0);
      const diffTime = exp - now;
      const rem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const batchNo = pb.batch_number;

      let alertType = null;
      let priority = 'Low';
      let msg = '';

      if (rem < 0) {
        alertType = 'expired';
        priority = 'High';
        msg = `Batch ${batchNo} of "${prod.product_name}" has expired!`;
      } else if (rem <= threshold) {
        alertType = 'near_expiry';
        if (rem <= 1) {
          priority = 'High';
          msg = `Batch ${batchNo} of "${prod.product_name}" expires in ${rem} day(s)!`;
        } else if (rem <= 3) {
          priority = 'Medium';
          msg = `Batch ${batchNo} of "${prod.product_name}" expires in ${rem} days.`;
        } else {
          priority = 'Low';
          msg = `Batch ${batchNo} of "${prod.product_name}" expires in ${rem} days.`;
        }
      }

      if (alertType) {
        const isRead = !!readAlertsMap[`${pb.id}-${alertType}`];
        newAlerts.push({
          id: pb.id * 1000 + uId * 10 + 1,
          user_id: uId,
          batch_id: pb.id,
          alert_type: alertType,
          priority,
          message: msg,
          is_read: isRead,
          created_at: pb.created_at || new Date(),
          product_name: prod.product_name,
          category: prod.category,
          expiry_date: pb.expiry_date,
          current_stock: pb.quantity,
          remaining_days: rem,
          batch_number: batchNo
        });
      }

      if (pb.quantity <= 15) {
        const stockType = 'low_stock';
        const stockPriority = pb.quantity === 0 ? 'High' : (pb.quantity <= 5 ? 'Medium' : 'Low');
        const stockMsg = pb.quantity === 0 
          ? `Batch ${batchNo} of "${prod.product_name}" is out of stock!`
          : `Batch ${batchNo} of "${prod.product_name}" has low stock (${pb.quantity} remaining).`;

        const isRead = !!readAlertsMap[`${pb.id}-${stockType}`];
        newAlerts.push({
          id: pb.id * 1000 + uId * 10 + 2,
          user_id: uId,
          batch_id: pb.id,
          alert_type: stockType,
          priority: stockPriority,
          message: stockMsg,
          is_read: isRead,
          created_at: pb.created_at || new Date(),
          product_name: prod.product_name,
          category: prod.category,
          expiry_date: pb.expiry_date,
          current_stock: pb.quantity,
          remaining_days: rem,
          batch_number: batchNo
        });
      }
    });

    mockAlerts = [...otherUsersAlerts, ...newAlerts];
    saveMockData();
  },

  // Recalculate Alerts for MySQL DB
  recalculateMySqlAlerts: async (userId) => {
    if (!userId) return;
    const uId = parseInt(userId);

    const settings = await db.getUserSettings(uId);
    const threshold = settings.reminder_threshold_days || 7;
    
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
      SELECT a.*, p.product_name, p.category, pb.expiry_date, pb.quantity AS current_stock,
             DATEDIFF(pb.expiry_date, CURDATE()) AS remaining_days,
             pb.batch_number
      FROM alerts a
      JOIN product_batches pb ON a.batch_id = pb.id
      JOIN products p ON pb.product_id = p.id
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

  markAllAlertsAsRead: async (userId) => {
    if (!userId) return false;
    const uId = parseInt(userId);
    if (useMock) {
      mockAlerts.forEach(a => {
        if (a.user_id === uId) a.is_read = true;
      });
      saveMockData();
      return true;
    }
    await pool.query('UPDATE alerts SET is_read = TRUE WHERE user_id = ?', [uId]);
    return true;
  },

  markAlertAsRead: async (id, userId) => {
    if (!userId) return false;
    const alertId = parseInt(id);
    const uId = parseInt(userId);
    if (useMock) {
      const alert = mockAlerts.find(a => a.id === alertId && a.user_id === uId);
      if (alert) {
        alert.is_read = true;
        saveMockData();
        return true;
      }
      return false;
    }
    await pool.query('UPDATE alerts SET is_read = TRUE WHERE id = ? AND user_id = ?', [alertId, uId]);
    return true;
  },

  getViewerData: async () => {
    const mapAndSortUsers = (usersList) => {
      return usersList.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.created_at,
        lastLogin: u.lastLogin || u.created_at
      })).sort((a, b) => {
        const dateA = new Date(a.lastLogin || a.createdAt);
        const dateB = new Date(b.lastLogin || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
    };

    if (useMock) {
      return {
        isMock: true,
        users: mapAndSortUsers(mockUsers),
        batches: await db.getAllBatches(),
        alerts: mockAlerts,
        settings: mockUserSettings,
        activityLog: mockUserActivities.map(act => {
          const u = mockUsers.find(user => user.id === act.user_id) || { name: 'User' };
          return { ...act, name: u.name };
        })
      };
    }
    const [users] = await pool.query('SELECT id, name, email, role, created_at FROM users');
    const batches = await db.getAllBatches();
    const [alerts] = await pool.query('SELECT * FROM alerts');
    const [settings] = await pool.query('SELECT * FROM user_settings');
    const [activities] = await pool.query(`
      SELECT ua.*, u.name 
      FROM user_activity ua 
      JOIN users u ON ua.user_id = u.id 
      ORDER BY ua.timestamp DESC
    `);
    return {
      isMock: false,
      users: mapAndSortUsers(users),
      batches: batches,
      alerts: alerts,
      settings: settings,
      activityLog: activities
    };
  }
};

// Initialize database
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
    handlePoolError(err);
  }
}, 5 * 60 * 1000);

module.exports = db;
