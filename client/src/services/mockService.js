// Client-side mock database service to run the app entirely offline when server is unreachable.
// Persisted in localStorage.

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Initialize localStorage databases with seed data
export const initMockData = () => {
  if (!localStorage.getItem('mock_users')) {
    localStorage.setItem('mock_users', JSON.stringify([
      { id: 1, fullName: 'Demo Admin', email: 'admin@example.com', password: 'admin123', role: 'admin' }
    ]));
  }

  if (!localStorage.getItem('mock_user_settings')) {
    localStorage.setItem('mock_user_settings', JSON.stringify([
      { user_id: 1, reminder_threshold_days: 5, alert_points: '1,3,5' }
    ]));
  }

  if (!localStorage.getItem('mock_batches')) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

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

    const batches = initialData.map((item, idx) => {
      const mfg = addDays(now, item.daysAgo);
      const exp = addDays(mfg, item.shelf_life);
      const remaining = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      
      let status = 'Fresh';
      if (remaining < 0) {
        status = 'Expired';
      } else if (remaining <= 5) {
        status = 'Near Expiry';
      }

      return {
        id: idx + 1,
        product_name: item.product_name,
        category: item.category,
        manufacturing_date: mfg.toISOString().split('T')[0],
        shelf_life: item.shelf_life,
        expiry_date: exp.toISOString().split('T')[0],
        quantity: item.quantity,
        status,
        source: 'Web Dashboard',
        batch_details: 'Initial inventory load.',
        created_at: new Date().toISOString()
      };
    });

    localStorage.setItem('mock_batches', JSON.stringify(batches));
  }

  if (!localStorage.getItem('mock_activity_log')) {
    localStorage.setItem('mock_activity_log', JSON.stringify([
      { id: '1', text: 'Client Mock database initialized with pre-seeded batches.', type: 'info', created_at: new Date().toISOString() }
    ]));
  }
};

// Log activity function for client logs
const logMockActivity = (text, type = 'info') => {
  const logs = JSON.parse(localStorage.getItem('mock_activity_log') || '[]');
  logs.unshift({
    id: Date.now() + Math.random().toString(),
    text,
    type,
    created_at: new Date().toISOString()
  });
  if (logs.length > 30) {
    logs.pop();
  }
  localStorage.setItem('mock_activity_log', JSON.stringify(logs));
};

// Recalculates batch statuses and updates alerts list
export const recalculateMockState = (userId) => {
  initMockData();
  const batches = JSON.parse(localStorage.getItem('mock_batches') || '[]');
  const settingsList = JSON.parse(localStorage.getItem('mock_user_settings') || '[]');
  
  let settings = settingsList.find(s => s.user_id === userId);
  if (!settings) {
    settings = { user_id: userId, reminder_threshold_days: 5, alert_points: '1,3,5' };
    settingsList.push(settings);
    localStorage.setItem('mock_user_settings', JSON.stringify(settingsList));
  }
  const threshold = settings.reminder_threshold_days;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Recalculate batch statuses
  const updatedBatches = batches.map(b => {
    const exp = new Date(b.expiry_date);
    exp.setHours(0, 0, 0, 0);
    const rem = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    
    let status = 'Fresh';
    if (rem < 0) {
      status = 'Expired';
    } else if (rem <= threshold) {
      status = 'Near Expiry';
    }
    return { ...b, status };
  });
  localStorage.setItem('mock_batches', JSON.stringify(updatedBatches));

  // Load existing alerts to check which ones are read
  const existingAlerts = JSON.parse(localStorage.getItem('mock_alerts') || '[]');
  const readAlertsMap = {};
  existingAlerts.forEach(a => {
    if (a.is_read && a.user_id === userId) {
      readAlertsMap[`${a.batch_id}-${a.alert_type}`] = true;
    }
  });

  // Filter out other users' alerts
  const otherUsersAlerts = existingAlerts.filter(a => a.user_id !== userId);

  const newAlerts = [];
  updatedBatches.forEach(b => {
    const exp = new Date(b.expiry_date);
    exp.setHours(0, 0, 0, 0);
    const rem = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    const batchNo = `B-BATCH-${String(b.id).padStart(3, '0')}`;

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
        id: b.id * 1000 + userId * 10 + 1,
        user_id: userId,
        batch_id: b.id,
        alert_type: alertType,
        priority,
        message: msg,
        is_read: isRead,
        created_at: b.created_at || new Date().toISOString(),
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
        id: b.id * 1000 + userId * 10 + 2,
        user_id: userId,
        batch_id: b.id,
        alert_type: stockType,
        priority: stockPriority,
        message: stockMsg,
        is_read: isRead,
        created_at: b.created_at || new Date().toISOString(),
        product_name: b.product_name,
        category: b.category,
        expiry_date: b.expiry_date,
        current_stock: b.quantity,
        remaining_days: rem,
        batch_number: batchNo
      });
    }
  });

  localStorage.setItem('mock_alerts', JSON.stringify([...otherUsersAlerts, ...newAlerts]));
};

// Extracts userId from Auth headers or default localStorage user
const getUserIdFromHeaders = (headers) => {
  const authHeader = headers?.['Authorization'] || headers?.['authorization'] || '';
  if (authHeader && authHeader.startsWith('Bearer mock-jwt-token-')) {
    const id = parseInt(authHeader.replace('Bearer mock-jwt-token-', ''));
    return isNaN(id) ? 1 : id;
  }
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.id) return u.id;
    } catch (e) {}
  }
  return 1;
};

// Formats error responses
const mockError = (status, message) => {
  const err = new Error(message);
  err.response = {
    status,
    data: { message }
  };
  return Promise.reject(err);
};

// Simulated mock API routes controller
export const handleMockRequest = async (config) => {
  initMockData();
  
  let path = config.url || '';
  // Clean url parameters and base url prefixes
  if (path.includes('/api/')) {
    path = path.substring(path.indexOf('/api/') + 4);
  } else if (path.startsWith('http')) {
    try {
      const urlObj = new URL(path);
      path = urlObj.pathname;
      if (path.startsWith('/api/')) {
        path = path.substring(4);
      }
    } catch (e) {}
  }

  // Parse path and query
  const pathParts = path.split('?')[0].split('/').filter(Boolean);
  const method = (config.method || 'get').toLowerCase();
  
  const userId = getUserIdFromHeaders(config.headers);

  // ----------------------------------------------------
  // ROUTE: POST /auth/login
  if (method === 'post' && pathParts[0] === 'auth' && pathParts[1] === 'login') {
    const { email, password } = JSON.parse(config.data || '{}');
    if (!email || !password) {
      return mockError(400, 'Email and password are required');
    }
    
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user || user.password !== password) {
      return mockError(400, 'Invalid credentials');
    }

    const token = `mock-jwt-token-${user.id}`;
    return {
      status: 200,
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        }
      }
    };
  }

  // ----------------------------------------------------
  // ROUTE: POST /auth/signup
  if (method === 'post' && pathParts[0] === 'auth' && pathParts[1] === 'signup') {
    const { fullName, email, password, confirmPassword } = JSON.parse(config.data || '{}');
    if (!fullName || !email || !password || !confirmPassword) {
      return mockError(400, 'All fields are required');
    }
    if (password !== confirmPassword) {
      return mockError(400, 'Passwords do not match');
    }

    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return mockError(400, 'Account already exists with this email');
    }

    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      fullName,
      email,
      password,
      role: 'user'
    };
    users.push(newUser);
    localStorage.setItem('mock_users', JSON.stringify(users));
    logMockActivity(`New user account registered for ${fullName} (${email})`, 'info');

    const token = `mock-jwt-token-${newUser.id}`;
    return {
      status: 201,
      data: {
        token,
        user: {
          id: newUser.id,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role
        }
      }
    };
  }

  // ----------------------------------------------------
  // ROUTE: POST /auth/google
  if (method === 'post' && pathParts[0] === 'auth' && pathParts[1] === 'google') {
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    let user = users.find(u => u.email === 'google-demo-user@example.com');
    if (!user) {
      user = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 99,
        fullName: 'Google Demo User',
        email: 'google-demo-user@example.com',
        password: '',
        role: 'user'
      };
      users.push(user);
      localStorage.setItem('mock_users', JSON.stringify(users));
    }
    const token = `mock-jwt-token-${user.id}`;
    return {
      status: 200,
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        }
      }
    };
  }

  // ----------------------------------------------------
  // ROUTE: GET /auth/settings
  if (method === 'get' && pathParts[0] === 'auth' && pathParts[1] === 'settings') {
    const settingsList = JSON.parse(localStorage.getItem('mock_user_settings') || '[]');
    let settings = settingsList.find(s => s.user_id === userId);
    if (!settings) {
      settings = { user_id: userId, reminder_threshold_days: 5, alert_points: '1,3,5' };
      settingsList.push(settings);
      localStorage.setItem('mock_user_settings', JSON.stringify(settingsList));
    }
    return { status: 200, data: settings };
  }

  // ----------------------------------------------------
  // ROUTE: PUT /auth/settings
  if (method === 'put' && pathParts[0] === 'auth' && pathParts[1] === 'settings') {
    const { reminder_threshold_days, alert_points } = JSON.parse(config.data || '{}');
    const threshold = parseInt(reminder_threshold_days);
    if (isNaN(threshold) || threshold < 1 || threshold > 365) {
      return mockError(400, 'Reminder threshold must be between 1 and 365 days');
    }

    const settingsList = JSON.parse(localStorage.getItem('mock_user_settings') || '[]');
    let idx = settingsList.findIndex(s => s.user_id === userId);
    const updated = {
      user_id: userId,
      reminder_threshold_days: threshold,
      alert_points: alert_points || '1,3,5'
    };

    if (idx !== -1) {
      settingsList[idx] = updated;
    } else {
      settingsList.push(updated);
    }
    localStorage.setItem('mock_user_settings', JSON.stringify(settingsList));

    recalculateMockState(userId);
    return { status: 200, data: updated };
  }

  // ----------------------------------------------------
  // ROUTE: GET /dashboard
  if (method === 'get' && pathParts[0] === 'dashboard') {
    recalculateMockState(userId);

    const batches = JSON.parse(localStorage.getItem('mock_batches') || '[]');
    const settingsList = JSON.parse(localStorage.getItem('mock_user_settings') || '[]');
    const settings = settingsList.find(s => s.user_id === userId) || { reminder_threshold_days: 5 };
    const threshold = settings.reminder_threshold_days;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const mapped = batches.map(b => {
      const exp = new Date(b.expiry_date);
      exp.setHours(0, 0, 0, 0);
      return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    });

    const totalBatches = batches.length;
    const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
    const expired = mapped.filter(r => r < 0).length;
    const expiringSoon = mapped.filter(r => r >= 0 && r <= threshold).length;
    const fresh = mapped.filter(r => r > threshold).length;

    // Charts Distribution
    const categories = {};
    batches.forEach(b => {
      categories[b.category] = (categories[b.category] || 0) + b.quantity;
    });

    const inventoryDistribution = Object.keys(categories).map(cat => ({
      name: cat,
      value: categories[cat]
    }));

    const stats = {
      totalProducts: totalBatches,
      totalBatches,
      totalStock,
      expiringSoon,
      expired,
      fresh
    };

    const charts = {
      inventoryDistribution,
      expiryTrends: [
        { name: 'Expired', count: expired },
        { name: `Near Expiry (0-${threshold}d)`, count: expiringSoon },
        { name: `Fresh (>${threshold}d)`, count: fresh }
      ],
      monthlyWastage: [
        { name: 'Jan', wastage: 10 },
        { name: 'Feb', wastage: 15 },
        { name: 'Mar', wastage: 5 },
        { name: 'Apr', wastage: 20 },
        { name: 'May', wastage: 8 },
        { name: 'Jun', wastage: 12 }
      ]
    };

    const recentActivity = JSON.parse(localStorage.getItem('mock_activity_log') || '[]').slice(0, 10);

    return {
      status: 200,
      data: {
        stats,
        charts,
        recentActivity,
        isMock: true
      }
    };
  }

  // ----------------------------------------------------
  // ROUTE: GET /alerts
  if (method === 'get' && pathParts[0] === 'alerts') {
    recalculateMockState(userId);
    const alerts = JSON.parse(localStorage.getItem('mock_alerts') || '[]');
    const userAlerts = alerts.filter(a => a.user_id === userId).sort((a, b) => {
      const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    return { status: 200, data: userAlerts };
  }

  // ----------------------------------------------------
  // ROUTE: PUT /alerts/read-all
  if (method === 'put' && pathParts[0] === 'alerts' && pathParts[1] === 'read-all') {
    const alerts = JSON.parse(localStorage.getItem('mock_alerts') || '[]');
    alerts.forEach(a => {
      if (a.user_id === userId) a.is_read = true;
    });
    localStorage.setItem('mock_alerts', JSON.stringify(alerts));
    return { status: 200, data: { message: 'All alerts marked as read' } };
  }

  // ----------------------------------------------------
  // ROUTE: PUT /alerts/:id/read
  if (method === 'put' && pathParts[0] === 'alerts' && pathParts[2] === 'read') {
    const alertId = parseInt(pathParts[1]);
    const alerts = JSON.parse(localStorage.getItem('mock_alerts') || '[]');
    const alert = alerts.find(a => a.id === alertId && a.user_id === userId);
    if (!alert) {
      return mockError(404, 'Alert not found');
    }
    alert.is_read = true;
    localStorage.setItem('mock_alerts', JSON.stringify(alerts));
    return { status: 200, data: { message: 'Alert marked as read' } };
  }

  // ----------------------------------------------------
  // ROUTE: GET /batches
  if (method === 'get' && pathParts[0] === 'batches' && pathParts.length === 1) {
    recalculateMockState(userId);
    
    // Parse query search parameter
    const searchParam = config.params?.search || '';
    const term = searchParam.toLowerCase();

    const batches = JSON.parse(localStorage.getItem('mock_batches') || '[]');
    const now = new Date();
    now.setHours(0,0,0,0);

    const list = batches.map(b => {
      const exp = new Date(b.expiry_date);
      exp.setHours(0,0,0,0);
      const rem = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...b,
        remaining_days: rem,
        batch_number: `B-BATCH-${String(b.id).padStart(3, '0')}`,
        prepared_date: b.manufacturing_date,
        quantity_produced: b.quantity,
        remaining_quantity: b.quantity
      };
    });

    const filtered = term 
      ? list.filter(b => 
          b.product_name.toLowerCase().includes(term) ||
          b.category.toLowerCase().includes(term) ||
          b.batch_number.toLowerCase().includes(term)
        )
      : list;

    return { status: 200, data: filtered };
  }

  // ----------------------------------------------------
  // ROUTE: GET /batches/:id
  if (method === 'get' && pathParts[0] === 'batches' && pathParts.length === 2) {
    recalculateMockState(userId);
    const bId = parseInt(pathParts[1]);
    const batches = JSON.parse(localStorage.getItem('mock_batches') || '[]');
    const b = batches.find(x => x.id === bId);
    if (!b) {
      return mockError(404, 'Batch not found');
    }

    const now = new Date();
    now.setHours(0,0,0,0);
    const exp = new Date(b.expiry_date);
    exp.setHours(0,0,0,0);
    const rem = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    const result = {
      ...b,
      remaining_days: rem,
      batch_number: `B-BATCH-${String(b.id).padStart(3, '0')}`,
      prepared_date: b.manufacturing_date,
      quantity_produced: b.quantity,
      remaining_quantity: b.quantity
    };
    return { status: 200, data: result };
  }

  // ----------------------------------------------------
  // ROUTE: POST /batches
  if (method === 'post' && pathParts[0] === 'batches') {
    let payload = JSON.parse(config.data || '{}');
    let { product_name, category, manufacturing_date, shelf_life, expiry_date, quantity, source, batch_details } = payload;

    // Expiry computing fallback
    if (manufacturing_date && expiry_date && (!shelf_life || isNaN(parseInt(shelf_life)))) {
      const mfg = new Date(manufacturing_date);
      const exp = new Date(expiry_date);
      if (!isNaN(mfg.getTime()) && !isNaN(exp.getTime())) {
        shelf_life = Math.ceil((exp - mfg) / (1000 * 60 * 60 * 24));
      }
    }

    if (!product_name || !category || !manufacturing_date || shelf_life === undefined || quantity === undefined) {
      return mockError(400, 'All fields are required');
    }

    const slVal = parseInt(shelf_life);
    const qtyVal = parseInt(quantity);
    if (isNaN(slVal) || slVal <= 0 || isNaN(qtyVal) || qtyVal < 0) {
      return mockError(400, 'Invalid numbers provided');
    }

    const computedExp = addDays(new Date(manufacturing_date), slVal);
    const computedExpStr = computedExp.toISOString().split('T')[0];

    const batches = JSON.parse(localStorage.getItem('mock_batches') || '[]');
    const newId = batches.length > 0 ? Math.max(...batches.map(b => b.id)) + 1 : 1;

    const newBatch = {
      id: newId,
      product_name,
      category,
      manufacturing_date,
      shelf_life: slVal,
      expiry_date: computedExpStr,
      quantity: qtyVal,
      status: 'Fresh',
      source: source || 'Web Dashboard',
      batch_details: batch_details || '',
      created_at: new Date().toISOString()
    };

    batches.push(newBatch);
    localStorage.setItem('mock_batches', JSON.stringify(batches));
    logMockActivity(`Added new batch for ${product_name} (${qtyVal} units)`, 'success');
    
    recalculateMockState(userId);

    const now = new Date();
    const rem = Math.ceil((computedExp - now) / (1000 * 60 * 60 * 24));
    
    return {
      status: 201,
      data: {
        ...newBatch,
        remaining_days: rem,
        batch_number: `B-BATCH-${String(newId).padStart(3, '0')}`,
        prepared_date: manufacturing_date,
        quantity_produced: qtyVal,
        remaining_quantity: qtyVal
      }
    };
  }

  // ----------------------------------------------------
  // ROUTE: PUT /batches/:id
  if (method === 'put' && pathParts[0] === 'batches' && pathParts.length === 2) {
    const bId = parseInt(pathParts[1]);
    let payload = JSON.parse(config.data || '{}');
    let { product_name, category, manufacturing_date, shelf_life, expiry_date, quantity, source, batch_details } = payload;

    // Expiry computing fallback
    if (manufacturing_date && expiry_date && (!shelf_life || isNaN(parseInt(shelf_life)))) {
      const mfg = new Date(manufacturing_date);
      const exp = new Date(expiry_date);
      if (!isNaN(mfg.getTime()) && !isNaN(exp.getTime())) {
        shelf_life = Math.ceil((exp - mfg) / (1000 * 60 * 60 * 24));
      }
    }

    if (!product_name || !category || !manufacturing_date || shelf_life === undefined || quantity === undefined) {
      return mockError(400, 'All fields are required');
    }

    const slVal = parseInt(shelf_life);
    const qtyVal = parseInt(quantity);

    const batches = JSON.parse(localStorage.getItem('mock_batches') || '[]');
    const idx = batches.findIndex(x => x.id === bId);
    if (idx === -1) {
      return mockError(404, 'Batch not found');
    }

    const computedExp = addDays(new Date(manufacturing_date), slVal);
    const computedExpStr = computedExp.toISOString().split('T')[0];

    batches[idx] = {
      ...batches[idx],
      product_name,
      category,
      manufacturing_date,
      shelf_life: slVal,
      expiry_date: computedExpStr,
      quantity: qtyVal,
      source: source || 'Web Dashboard',
      batch_details: batch_details || ''
    };

    localStorage.setItem('mock_batches', JSON.stringify(batches));
    logMockActivity(`Updated batch details for ${product_name}`, 'info');

    recalculateMockState(userId);

    const now = new Date();
    const rem = Math.ceil((computedExp - now) / (1000 * 60 * 60 * 24));

    return {
      status: 200,
      data: {
        ...batches[idx],
        remaining_days: rem,
        batch_number: `B-BATCH-${String(bId).padStart(3, '0')}`,
        prepared_date: manufacturing_date,
        quantity_produced: qtyVal,
        remaining_quantity: qtyVal
      }
    };
  }

  // ----------------------------------------------------
  // ROUTE: DELETE /batches/:id
  if (method === 'delete' && pathParts[0] === 'batches' && pathParts.length === 2) {
    const bId = parseInt(pathParts[1]);
    const batches = JSON.parse(localStorage.getItem('mock_batches') || '[]');
    const idx = batches.findIndex(x => x.id === bId);
    if (idx === -1) {
      return mockError(404, 'Batch not found');
    }

    const pName = batches[idx].product_name;
    batches.splice(idx, 1);
    localStorage.setItem('mock_batches', JSON.stringify(batches));

    // Delete associated alerts
    const alerts = JSON.parse(localStorage.getItem('mock_alerts') || '[]');
    const updatedAlerts = alerts.filter(a => a.batch_id !== bId);
    localStorage.setItem('mock_alerts', JSON.stringify(updatedAlerts));

    logMockActivity(`Deleted batch for ${pName}`, 'warning');
    recalculateMockState(userId);

    return {
      status: 200,
      data: { message: 'Batch deleted successfully' }
    };
  }

  // ----------------------------------------------------
  // ROUTE: POST /process
  if (method === 'post' && pathParts[0] === 'process') {
    recalculateMockState(userId);
    const batches = JSON.parse(localStorage.getItem('mock_batches') || '[]');
    return {
      status: 200,
      data: {
        message: 'All batch expiry statuses and alerts recalculated successfully',
        batchesCount: batches.length
      }
    };
  }

  // ----------------------------------------------------
  // ROUTE: POST /chatbot
  if (method === 'post' && pathParts[0] === 'chatbot') {
    const { message } = JSON.parse(config.data || '{}');
    if (!message) {
      return mockError(400, 'Message is required');
    }

    const query = message.trim().toLowerCase();
    const batches = JSON.parse(localStorage.getItem('mock_batches') || '[]');
    const settingsList = JSON.parse(localStorage.getItem('mock_user_settings') || '[]');
    const settings = settingsList.find(s => s.user_id === userId) || { reminder_threshold_days: 5 };
    const threshold = settings.reminder_threshold_days;

    const now = new Date();
    now.setHours(0,0,0,0);

    const list = batches.map(b => {
      const exp = new Date(b.expiry_date);
      exp.setHours(0,0,0,0);
      const rem = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      return {
        ...b,
        remaining_days: rem,
        batch_number: `B-BATCH-${String(b.id).padStart(3, '0')}`
      };
    });

    let reply = '';
    let responseType = 'general';
    let matched = [];

    if (query.includes('use first') || query.includes('which batch') || query.includes('fefo') || query.includes('earliest expiry')) {
      responseType = 'fefo';
      const active = list.filter(b => b.quantity > 0 && b.remaining_days >= 0);
      const groups = {};
      active.forEach(b => {
        if (!groups[b.product_name]) groups[b.product_name] = [];
        groups[b.product_name].push(b);
      });

      const recs = [];
      reply = "### First Expiry First Out (FEFO) Recommendations\n\nTo minimize waste, please prioritize utilizing the following batches first:\n\n";

      Object.keys(groups).forEach(pName => {
        const sorted = groups[pName].sort((a, b) => a.remaining_days - b.remaining_days);
        const nextBatch = sorted[0];
        recs.push(nextBatch);
        reply += `- **${pName}**: Use **${nextBatch.batch_number}** first (${nextBatch.remaining_days === 0 ? 'expires today' : `expires in **${nextBatch.remaining_days} days**`}, **${nextBatch.quantity}** units remaining).\n`;
      });

      if (recs.length === 0) {
        reply = "There are no active batches with stock to suggest using first.";
      } else {
        matched = recs;
      }
    } else if (query.includes('expired')) {
      responseType = 'expired';
      matched = list.filter(b => b.remaining_days < 0);
      if (matched.length === 0) {
        reply = "Good news! There are no expired items in your inventory currently.";
      } else {
        reply = `I found **${matched.length} expired item(s)**. These must be discarded immediately to maintain inventory safety.`;
      }
    } else if (query.includes('near expiry') || query.includes('near-expiry') || query.includes('expiring')) {
      responseType = 'near_expiry';
      matched = list.filter(b => b.remaining_days >= 0 && b.remaining_days <= threshold);
      if (matched.length === 0) {
        reply = `Excellent! There are no items near expiry (warning threshold is set to **${threshold} days**).`;
      } else {
        reply = `There are **${matched.length} item(s) near expiry** (within your **${threshold} days** threshold). Please prioritize utilizing or dispatching them.`;
      }
    } else if (query.includes('what should i do') || query.includes('recommendations') || query.includes('suggestions')) {
      responseType = 'suggestions';
      const expiredCount = list.filter(b => b.remaining_days < 0).length;
      const nearCount = list.filter(b => b.remaining_days >= 0 && b.remaining_days <= threshold).length;

      if (expiredCount === 0 && nearCount === 0) {
        reply = "All systems clear! No items are expired or near expiry. No immediate action is required.";
      } else {
        reply = "Here are your recommended actions:\n\n";
        if (expiredCount > 0) {
          reply += `🚨 **Discard Expired Batches:** You have **${expiredCount} expired batch(es)**. Dispose of them immediately to prevent safety issues.\n`;
        }
        if (nearCount > 0) {
          reply += `⚠️ **Prioritize Near Expiry:** There are **${nearCount} batch(es)** expiring within **${threshold} days**. Move them to the front of stock or prepare for immediate dispatch.\n`;
        }
      }
    } else {
      reply = `Hello! I am your client-side offline Assistant. I can help you query your stock details and reminders.
 
You can ask me questions like:
- **"Which batch should I use first?"**
- **"Show near-expiry batches"**
- **"List expired items"**
- **"What should I do now?"**`;
    }

    return {
      status: 200,
      data: {
        reply,
        type: responseType,
        batches: matched.map(b => ({
          id: b.id,
          product_name: b.product_name,
          category: b.category,
          batch_number: b.batch_number,
          expiry_date: b.expiry_date,
          quantity: b.quantity,
          remaining_days: b.remaining_days,
          status: b.status
        }))
      }
    };
  }

  // Fallback / Route not matched
  return mockError(404, `Route ${method.toUpperCase()} /api/${path} not found`);
};
