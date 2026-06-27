/**
 * Helper to generate a beautiful, responsive HTML admin dashboard for DB Viewer
 */
function renderDbViewerHtml(data) {
  const { isMock, users, batches, alerts, settings, activityLog } = data;
  
  // Format stats
  const totalBatches = batches.length;
  const totalUsers = users.length;
  const totalAlerts = alerts.length;
  const dbType = isMock ? 'In-Memory (Mock)' : 'MySQL Database';
  const dbStatusClass = isMock ? 'status-warning' : 'status-success';
  const dbStatusText = isMock ? 'Mock Fallback Active' : 'Connected to MySQL';

  // Safe date formatter supporting both String and Date instances
  const safeFormatDate = (val) => {
    if (!val) return 'N/A';
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'string') {
      return val.split('T')[0];
    }
    try {
      return new Date(val).toISOString().split('T')[0];
    } catch (e) {
      return String(val);
    }
  };

  // Helper to get batch status class
  const getBatchStatusClass = (status) => {
    switch (String(status).toLowerCase()) {
      case 'expired': return 'badge-danger';
      case 'near expiry': return 'badge-warning';
      default: return 'badge-success';
    }
  };

  // Helper to get alert priority class
  const getPriorityClass = (priority) => {
    switch (String(priority).toLowerCase()) {
      case 'high': return 'badge-danger';
      case 'medium': return 'badge-warning';
      default: return 'badge-info';
    }
  };

  // Build Batch Rows HTML
  const batchRows = batches.map(b => `
    <tr>
      <td><span class="batch-num">${b.batch_number || `B-BATCH-${String(b.id).padStart(3, '0')}`}</span></td>
      <td><strong>${b.product_name}</strong></td>
      <td><span class="category-tag">${b.category}</span></td>
      <td>${safeFormatDate(b.manufacturing_date)}</td>
      <td>${b.shelf_life} days</td>
      <td>${safeFormatDate(b.expiry_date)}</td>
      <td><strong>${b.quantity}</strong></td>
      <td>
        <span class="badge ${getBatchStatusClass(b.status)}">${b.status}</span>
        <span class="remaining-days">${b.remaining_days >= 0 ? `${b.remaining_days}d left` : 'Expired'}</span>
      </td>
      <td><span class="source-tag">${b.source || 'N/A'}</span></td>
    </tr>
  `).join('');

  // Build User Rows HTML
  const userRows = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td><strong>${u.full_name}</strong></td>
      <td>${u.email}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-info'}">${u.role}</span></td>
      <td>${u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A'}</td>
    </tr>
  `).join('');

  // Build Alert Rows HTML
  const alertRows = alerts.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>User ${a.user_id}</td>
      <td>Batch #${a.batch_id}</td>
      <td><span class="badge ${a.alert_type === 'expired' ? 'badge-danger' : a.alert_type === 'near_expiry' ? 'badge-warning' : 'badge-info'}">${a.alert_type}</span></td>
      <td><span class="badge ${getPriorityClass(a.priority)}">${a.priority}</span></td>
      <td>${a.message}</td>
      <td><span class="badge ${a.is_read ? 'badge-success' : 'badge-warning'}">${a.is_read ? 'Read' : 'Unread'}</span></td>
      <td>${a.created_at ? new Date(a.created_at).toLocaleString() : 'N/A'}</td>
    </tr>
  `).join('');

  // Build Settings Rows HTML
  const settingsRows = settings.map(s => `
    <tr>
      <td><strong>User ${s.user_id}</strong></td>
      <td><span class="badge badge-purple">${s.reminder_threshold_days} days</span></td>
      <td><code>${s.alert_points}</code></td>
    </tr>
  `).join('');

  // Build Activity Log Rows HTML
  const activityRows = activityLog && activityLog.length > 0 
    ? activityLog.map(act => `
        <div class="log-item ${act.type || 'info'}">
          <span class="log-time">[${new Date(act.created_at).toLocaleTimeString()}]</span>
          <span class="log-text">${act.text}</span>
        </div>
      `).join('')
    : `<div class="empty-state">No activities logged. (Activity logging is only active in in-memory mock fallback mode)</div>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Explorer - Shelf Life Reminder</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #faf6f0;
      --bg-panel: #ffffff;
      --bg-card: #ffffff;
      --border-color: #eedec5;
      --text-main: #3e2723;
      --text-muted: #8d6e63;
      
      --primary: #e05a10;
      --primary-hover: #c84b00;
      --primary-light: #fff3e0;
      --primary-glow: rgba(224, 90, 16, 0.2);
      
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.2);
      --warning: #f59e0b;
      --warning-glow: rgba(245, 158, 11, 0.2);
      --danger: #ef4444;
      --danger-glow: rgba(239, 68, 68, 0.2);
      --purple: #8b5cf6;
      --info: #06b6d4;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      padding: 2rem;
      min-height: 100vh;
      background-image: 
        radial-gradient(at 0% 0%, rgba(224, 90, 16, 0.05) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(62, 39, 35, 0.04) 0px, transparent 50%);
      background-attachment: fixed;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1.5rem;
    }

    .brand-section h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.8rem;
      font-weight: 700;
      background: linear-gradient(135deg, #e05a10, #3e2723);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.25rem;
    }

    .brand-section p {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .db-status-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    .pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      position: relative;
    }

    .status-success .pulse-dot {
      background-color: var(--success);
      box-shadow: 0 0 10px var(--success);
    }
    
    .status-warning .pulse-dot {
      background-color: var(--warning);
      box-shadow: 0 0 10px var(--warning);
    }

    .pulse-dot::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      top: 0;
      left: 0;
      animation: pulse 1.8s infinite ease-in-out;
    }

    .status-success .pulse-dot::after {
      background-color: var(--success);
    }
    
    .status-warning .pulse-dot::after {
      background-color: var(--warning);
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    .db-status-text {
      font-size: 0.85rem;
      font-weight: 600;
    }

    .status-success .db-status-text { color: #059669; }
    .status-warning .db-status-text { color: #d97706; }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 6px -1px rgba(62, 39, 35, 0.05);
    }

    .stat-card:hover {
      transform: translateY(-2px);
      border-color: var(--primary);
      box-shadow: 0 10px 15px -3px rgba(62, 39, 35, 0.08);
    }

    .stat-label {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-family: 'Outfit', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .stat-footer {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    /* Main Container & Tabs */
    .explorer-panel {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 1.75rem;
      box-shadow: 0 10px 30px rgba(62, 39, 35, 0.05);
    }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    .tab-btn {
      background: rgba(62, 39, 35, 0.03);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 0.6rem 1.2rem;
      border-radius: 10px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      background: rgba(62, 39, 35, 0.06);
      color: var(--text-main);
    }

    .tab-btn.active {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
      box-shadow: 0 4px 12px var(--primary-glow);
    }

    .action-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .panel-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .refresh-btn {
      background: rgba(62, 39, 35, 0.03);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s;
    }

    .refresh-btn:hover {
      background: rgba(62, 39, 35, 0.07);
    }

    /* Tables */
    .table-container {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      background-color: rgba(62, 39, 35, 0.02);
      color: var(--text-muted);
      padding: 1rem;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 1rem;
      font-size: 0.9rem;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background-color: var(--primary-light);
    }

    /* Badges & Tags */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .badge-success { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
    .badge-warning { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
    .badge-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
    .badge-info { background: #f0fdfa; color: #0d9488; border: 1px solid #ccfbf1; }
    .badge-purple { background: #f3e8ff; color: #7c3aed; border: 1px solid #e9d5ff; }

    .category-tag {
      background: rgba(62, 39, 35, 0.04);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      color: var(--text-muted);
      border: 1px solid rgba(62, 39, 35, 0.02);
    }

    .source-tag {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .batch-num {
      font-family: monospace;
      font-weight: 600;
      color: var(--primary);
    }

    .remaining-days {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-left: 0.5rem;
    }

    /* JSON Viewer */
    .json-wrapper {
      position: relative;
    }

    .copy-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: rgba(62, 39, 35, 0.03);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .copy-btn:hover {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }

    pre {
      background: #faf6f0;
      border: 1px solid var(--border-color);
      padding: 1.5rem;
      border-radius: 12px;
      overflow-x: auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      color: #059669;
      max-height: 500px;
    }

    /* Activity Logs */
    .log-container {
      background: #faf6f0;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 0.85rem;
      line-height: 1.6;
    }

    .log-item {
      padding: 0.35rem 0.5rem;
      border-bottom: 1px solid rgba(62, 39, 35, 0.05);
    }

    .log-item:last-child {
      border-bottom: none;
    }

    .log-time {
      color: var(--text-muted);
      margin-right: 0.5rem;
    }

    .log-item.success .log-text { color: #059669; }
    .log-item.warning .log-text { color: #d97706; }
    .log-item.error .log-text { color: #dc2626; }
    .log-item.info .log-text { color: #2563eb; }

    .empty-state {
      padding: 3rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }
      header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .db-status-container {
        align-self: flex-start;
      }
    }
  </style>
</head>
<body>

  <header>
    <div class="brand-section">
      <h1>Database Explorer</h1>
      <p>Real-time visual explorer for debugging Shelf Life & Expiry Reminder data</p>
    </div>
    
    <div class="db-status-container ${dbStatusClass}">
      <span class="pulse-dot"></span>
      <span class="db-status-text">${dbStatusText} (${dbType})</span>
    </div>
  </header>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Production Batches</div>
      <div class="stat-value">${totalBatches}</div>
      <div class="stat-footer">📦 Total batches stored</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Registered Users</div>
      <div class="stat-value">${totalUsers}</div>
      <div class="stat-footer">👥 Active accounts</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">System Alerts</div>
      <div class="stat-value">${totalAlerts}</div>
      <div class="stat-footer">🔔 Warnings & status updates</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Database Engine</div>
      <div class="stat-value" style="font-size: 1.4rem; padding-top: 0.4rem;">${isMock ? 'In-Memory' : 'MySQL'}</div>
      <div class="stat-footer">⚡ Engine running mode</div>
    </div>
  </div>

  <div class="explorer-panel">
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab(event, 'batches-tab')">📦 Production Batches</button>
      <button class="tab-btn" onclick="switchTab(event, 'users-tab')">👥 Users</button>
      <button class="tab-btn" onclick="switchTab(event, 'alerts-tab')">🔔 Alerts</button>
      <button class="tab-btn" onclick="switchTab(event, 'settings-tab')">⚙️ User Settings</button>
      <button class="tab-btn" onclick="switchTab(event, 'logs-tab')">📋 Activity Logs</button>
      <button class="tab-btn" onclick="switchTab(event, 'json-tab')">📄 Raw JSON Data</button>
    </div>

    <!-- Batches Tab -->
    <div id="batches-tab" class="tab-content active">
      <div class="action-row">
        <h3 class="panel-title">Production Batches (production_batches)</h3>
        <button class="refresh-btn" onclick="window.location.reload()">🔄 Refresh</button>
      </div>
      <div class="table-container">
        ${totalBatches > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Mfg Date</th>
                <th>Shelf Life</th>
                <th>Expiry Date</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${batchRows}
            </tbody>
          </table>
        ` : `
          <div class="empty-state">No batches found in the database.</div>
        `}
      </div>
    </div>

    <!-- Users Tab -->
    <div id="users-tab" class="tab-content">
      <div class="action-row">
        <h3 class="panel-title">System Users (users)</h3>
      </div>
      <div class="table-container">
        ${totalUsers > 0 ? `
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${userRows}
            </tbody>
          </table>
        ` : `
          <div class="empty-state">No users registered in the database.</div>
        `}
      </div>
    </div>

    <!-- Alerts Tab -->
    <div id="alerts-tab" class="tab-content">
      <div class="action-row">
        <h3 class="panel-title">System Alerts (alerts)</h3>
      </div>
      <div class="table-container">
        ${totalAlerts > 0 ? `
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Batch ID</th>
                <th>Alert Type</th>
                <th>Priority</th>
                <th>Message</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${alertRows}
            </tbody>
          </table>
        ` : `
          <div class="empty-state">No system alerts generated yet.</div>
        `}
      </div>
    </div>

    <!-- Settings Tab -->
    <div id="settings-tab" class="tab-content">
      <div class="action-row">
        <h3 class="panel-title">User Settings (user_settings)</h3>
      </div>
      <div class="table-container">
        ${settings && settings.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Reminder Threshold</th>
                <th>Alert Points</th>
              </tr>
            </thead>
            <tbody>
              ${settingsRows}
            </tbody>
          </table>
        ` : `
          <div class="empty-state">No settings records found in the database.</div>
        `}
      </div>
    </div>

    <!-- Logs Tab -->
    <div id="logs-tab" class="tab-content">
      <div class="action-row">
        <h3 class="panel-title">In-Memory Activity Log</h3>
      </div>
      <div class="log-container">
        ${activityRows}
      </div>
    </div>

    <!-- JSON Tab -->
    <div id="json-tab" class="tab-content">
      <div class="action-row">
        <h3 class="panel-title">Entire JSON Data Payload</h3>
        <button class="refresh-btn" onclick="copyJson()">📋 Copy JSON</button>
      </div>
      <div class="json-wrapper">
        <pre><code id="json-code">${JSON.stringify(data, null, 2)}</code></pre>
      </div>
    </div>
  </div>

  <script>
    function switchTab(evt, tabId) {
      // Hide all contents
      const contents = document.querySelectorAll('.tab-content');
      contents.forEach(content => content.classList.remove('active'));

      // Remove active from all buttons
      const buttons = document.querySelectorAll('.tab-btn');
      buttons.forEach(btn => btn.classList.remove('active'));

      // Show current tab and set button active
      document.getElementById(tabId).classList.add('active');
      evt.currentTarget.classList.add('active');
    }

    function copyJson() {
      const codeElement = document.getElementById('json-code');
      const text = codeElement.innerText;
      
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('#json-tab .refresh-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  </script>
</body>
</html>
  `;
}

module.exports = { renderDbViewerHtml };
