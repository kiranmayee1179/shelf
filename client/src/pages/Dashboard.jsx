import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBarcode,
  FaBoxes,
  FaCheckCircle,
  FaCalendarTimes, 
  FaExclamationTriangle,
  FaArrowRight,
  FaSync
} from 'react-icons/fa';
import API from '../services/api';
import DashboardCard from '../components/DashboardCard';

const COLORS = ['#e05a10', '#8d6e63', '#f59e0b', '#10b981', '#d84315', '#4e342e', '#ffb74d'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  
  const [stats, setStats] = useState({
    totalBatches: 0,
    totalStock: 0,
    expiringSoon: 0,
    expired: 0,
    fresh: 0
  });

  const [charts, setCharts] = useState({
    inventoryDistribution: [],
    expiryTrends: [],
    monthlyWastage: []
  });

  const [alerts, setAlerts] = useState([]);
  const [isMockDb, setIsMockDb] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [dbRes, alertsRes] = await Promise.all([
        API.get('/dashboard'),
        API.get('/alerts')
      ]);

      // Validate dbRes response payload
      if (!dbRes || !dbRes.data || typeof dbRes.data !== 'object') {
        throw new Error('Invalid or empty dashboard API response');
      }

      // Safeguard against HTML string responses (like catch-all redirects returning index.html)
      if (typeof dbRes.data === 'string' && dbRes.data.trim().startsWith('<!DOCTYPE')) {
        throw new Error('Expected JSON response, but received HTML from dashboard API');
      }

      const { stats: fetchedStats, charts: fetchedCharts, isMock } = dbRes.data;

      if (!fetchedStats || typeof fetchedStats !== 'object') {
        throw new Error('Dashboard stats missing or invalid in API response');
      }

      if (!fetchedCharts || typeof fetchedCharts !== 'object') {
        throw new Error('Dashboard charts missing or invalid in API response');
      }

      setStats(fetchedStats);
      setCharts(fetchedCharts);
      setIsMockDb(!!isMock);

      // Validate alerts response payload
      if (alertsRes && Array.isArray(alertsRes.data)) {
        setAlerts(alertsRes.data);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
      setError('Error fetching dashboard records. Please verify server status.');
    }
  };

  useEffect(() => {
    const loadInit = async () => {
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    };
    loadInit();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      await API.post('/process');
      await fetchDashboardData();
    } catch (err) {
      console.error('Manual sync failed', err);
      setError('Failed to trigger manual expiry and alerts calculation.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Loading system dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {isMockDb && (
        <div className="alert-banner info" style={{ marginBottom: '1.5rem', borderLeftColor: 'var(--primary)' }}>
          <div className="alert-banner-message">
            <strong>System Notice:</strong> Server is running in <strong>In-Memory (Mock Fallback) mode</strong>. Standard MySQL connection is currently unavailable. All operations are fully supported in preview.
          </div>
        </div>
      )}

      {error && (
        <div className="alert-banner danger" style={{ marginBottom: '1.5rem' }}>
          <div className="alert-banner-message">{error}</div>
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-header-title">Sharadha Stores Dashboard</h1>
          <p className="page-header-subtitle">Real-time batch tracking and shelf life monitoring systems</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSync} 
          disabled={syncing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FaSync className={syncing ? 'spin-animation' : ''} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{syncing ? 'Processing Expiry...' : 'Run Expiry Check'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <DashboardCard 
          label="Total Batches" 
          value={stats?.totalBatches || 0} 
          icon={<FaBarcode />} 
          variant="primary"
          onClick={() => navigate('/batches')}
        />
        <DashboardCard 
          label="Total Stock Units" 
          value={stats?.totalStock || 0} 
          icon={<FaBoxes />} 
          variant="success"
          onClick={() => navigate('/batches')}
        />
        <DashboardCard 
          label="Fresh Batches" 
          value={stats?.fresh || 0} 
          icon={<FaCheckCircle />} 
          variant="success"
          onClick={() => navigate('/batches')}
        />
        <DashboardCard 
          label="Expiring Soon" 
          value={stats?.expiringSoon || 0} 
          icon={<FaExclamationTriangle />} 
          variant="warning"
          onClick={() => navigate('/alerts')}
        />
        <DashboardCard 
          label="Expired Batches" 
          value={stats?.expired || 0} 
          icon={<FaCalendarTimes />} 
          variant="danger"
          onClick={() => navigate('/alerts')}
        />
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Chart 1: Expiry Trends */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Expiry Risks & Timelines</span>
            <span className="page-header-subtitle">Active batches count</span>
          </div>
          <div className="chart-container" style={{ padding: '0.5rem 0' }}>
            {(!charts?.expiryTrends || charts.expiryTrends.length === 0) ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No statistics recorded</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'center', height: '100%' }}>
                {(charts?.expiryTrends || []).map((entry, idx) => {
                  let colorClass = 'primary';
                  if (entry.name?.includes('Expired')) colorClass = 'danger';
                  else if (entry.name?.includes('Near Expiry')) colorClass = 'warning';
                  else if (entry.name?.includes('Fresh')) colorClass = 'success';
                  
                  const percentage = (stats?.totalBatches || 0) > 0 ? ((entry.count || 0) / stats.totalBatches) * 100 : 0;
                  
                  return (
                    <div key={idx} className="bar-row" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 550 }}>
                        <span style={{ color: 'var(--text)' }}>{entry.name}</span>
                        <span style={{ color: `var(--${colorClass})` }}>{entry.count || 0} batches ({Math.round(percentage)}%)</span>
                      </div>
                      <div style={{ height: '10px', background: 'var(--border-color, #e2e8f0)', borderRadius: '6px', overflow: 'hidden', width: '100%' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: `var(--${colorClass})`, borderRadius: '6px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Category Wise Stock Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Stock Distribution by Category</span>
          </div>
          <div className="chart-container" style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {(!charts?.inventoryDistribution || charts.inventoryDistribution.length === 0) ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active stock</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(charts?.inventoryDistribution || []).map((entry, idx) => {
                  const percentage = (stats?.totalStock || 0) > 0 ? ((entry.value || 0) / stats.totalStock) * 100 : 0;
                  const barColor = COLORS[idx % COLORS.length];
                  return (
                    <div key={idx} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 550 }}>
                        <span style={{ color: 'var(--text)' }}>{entry.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{entry.value || 0} units ({Math.round(percentage)}%)</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--border-color, #e2e8f0)', borderRadius: '4px', overflow: 'hidden', width: '100%' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wastage & Activity Grid */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Wastage / Write-off Unit Trends</span>
            <span className="page-header-subtitle">Estimated cost write-off units per month</span>
          </div>
          <div className="chart-container" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', padding: '1rem 0.5rem 0.5rem 0.5rem' }}>
            {!charts?.monthlyWastage || charts.monthlyWastage.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No monthly trends recorded</span>
              </div>
            ) : (
              (charts?.monthlyWastage || []).map((entry, idx) => {
                const maxWastage = Math.max(...(charts?.monthlyWastage || []).map(m => m.wastage || 0), 1);
                const heightPercentage = ((entry.wastage || 0) / maxWastage) * 100;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--danger)', marginBottom: '0.4rem' }}>
                      {entry.wastage || 0}
                    </span>
                    <div 
                      style={{ 
                        width: '24px', 
                        height: `${heightPercentage * 1.1}px`, 
                        background: 'rgba(239, 68, 68, 0.15)', 
                        borderTop: '3px solid var(--danger)', 
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease'
                      }} 
                      title={`${entry.name || ''}: ${entry.wastage || 0} units`}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem', fontWeight: 550 }}>
                      {entry.name || ''}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="details-card">
          <div className="details-header">
            <span className="details-title">Active Expiry & Stock Alerts</span>
            <button className="btn btn-secondary btn-icon-only" onClick={() => navigate('/alerts')} title="View All Alerts">
              <FaArrowRight style={{ fontSize: '0.85rem' }} />
            </button>
          </div>
          <div className="activity-list">
            {!alerts || alerts.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active alerts. All stock is safe.</span>
              </div>
            ) : (
              (alerts || []).slice(0, 5).map((alert) => (
                <div 
                  key={alert.id} 
                  className="activity-item" 
                  style={{ cursor: 'pointer' }} 
                  onClick={() => navigate(`/batches/${alert.batch_id}`)}
                  title="Click to view batch details"
                >
                  <span className={`activity-dot ${alert.priority === 'High' ? 'danger' : (alert.priority === 'Medium' ? 'warning' : 'info')}`} />
                  <div className="activity-content">
                    <span className="activity-text" style={{ fontWeight: 600 }}>{alert.message}</span>
                    <span className="activity-time" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                      <span className={`badge ${alert.priority === 'High' ? 'badge-red' : (alert.priority === 'Medium' ? 'badge-orange' : 'badge-blue')}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                        {alert.priority} Priority
                      </span>
                      <span>Expires: {alert.expiry_date ? new Date(alert.expiry_date).toLocaleDateString() : 'N/A'}</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Dynamic Keyframes injected for rotate spin */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
