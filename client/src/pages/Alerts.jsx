import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBell, 
  FaSearch, 
  FaCheck, 
  FaEye, 
  FaFilter, 
  FaExclamationTriangle,
  FaCalendarTimes,
  FaBoxes,
  FaTrash
} from 'react-icons/fa';
import API from '../services/api';

const Alerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await API.get('/alerts');
      setAlerts(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Could not load automated expiry and stock alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      await API.put(`/alerts/${id}/read`);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to mark alert as read', err);
      alert('Failed to dismiss alert.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.put('/alerts/read-all');
      fetchAlerts();
    } catch (err) {
      console.error('Failed to mark all read', err);
      alert('Failed to dismiss all alerts.');
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return <span className="badge badge-red">High</span>;
      case 'Medium':
        return <span className="badge badge-orange">Medium</span>;
      case 'Low':
      default:
        return <span className="badge badge-blue">Low</span>;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'expired':
        return <FaCalendarTimes style={{ color: 'var(--danger)', fontSize: '1.1rem' }} />;
      case 'near_expiry':
        return <FaExclamationTriangle style={{ color: 'var(--warning)', fontSize: '1.1rem' }} />;
      case 'low_stock':
      default:
        return <FaBoxes style={{ color: '#ea580c', fontSize: '1.1rem' }} />;
    }
  };

  const getStatusLabel = (type) => {
    switch (type) {
      case 'expired':
        return 'Expired';
      case 'near_expiry':
        return 'Near Expiry';
      case 'low_stock':
      default:
        return 'Low Stock';
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter logic
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      alert.product_name.toLowerCase().includes(search.toLowerCase()) ||
      alert.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      alert.message.toLowerCase().includes(search.toLowerCase());

    const matchesPriority = priorityFilter === 'All' || alert.priority === priorityFilter;

    let matchesType = true;
    if (typeFilter === 'expiry') {
      matchesType = alert.alert_type === 'expired' || alert.alert_type === 'near_expiry';
    } else if (typeFilter === 'stock') {
      matchesType = alert.alert_type === 'low_stock';
    }

    return matchesSearch && matchesPriority && matchesType;
  });

  const unreadAlerts = filteredAlerts.filter(a => !a.is_read);
  const readAlerts = filteredAlerts.filter(a => a.is_read);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Checking expiry statuses...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Automated Expiry & Stock Alerts</h1>
          <p className="page-header-subtitle">Real-time alerts for overdue batches and critical stock limits</p>
        </div>
        {unreadAlerts.length > 0 && (
          <button className="btn btn-secondary" onClick={handleMarkAllRead}>
            <FaCheck />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert-banner danger" style={{ marginBottom: '1.5rem' }}>
          <div className="alert-banner-message">{error}</div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="table-actions-bar" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="navbar-search" style={{ width: '320px' }}>
          <FaSearch className="navbar-search-icon" />
          <input 
            type="text" 
            className="navbar-search-input" 
            placeholder="Search alerts..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group" style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaFilter style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Priority:</span>
          </div>
          <select 
            className="form-select" 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Type:</span>
          <select 
            className="form-select" 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="expiry">Expiry Alerts</option>
            <option value="stock">Stock Alerts</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Icon</th>
                <th>Batch</th>
                <th>Product Name</th>
                <th>Alert Condition</th>
                <th>Expiry Date</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Priority</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="no-data">
                    <FaBell className="no-data-icon" />
                    <p>No active alerts matching the selected filters. All systems are safe.</p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map(alert => (
                  <tr 
                    key={alert.id}
                    onClick={() => navigate(`/batches/${alert.batch_id}`)}
                    style={{ 
                      cursor: 'pointer',
                      opacity: alert.is_read ? 0.7 : 1,
                      backgroundColor: alert.is_read ? 'transparent' : 'rgba(224, 90, 16, 0.015)',
                      borderLeft: alert.is_read ? 'none' : '4px solid var(--primary)'
                    }}
                    title="Click to view batch specifications"
                  >
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {getAlertIcon(alert.alert_type)}
                      </div>
                    </td>
                    <td data-label="Batch">
                      <code style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{alert.batch_number}</code>
                    </td>
                    <td data-label="Product Name" style={{ fontWeight: 600 }}>{alert.product_name}</td>
                    <td data-label="Alert Condition" style={{ fontSize: '0.85rem' }}>{alert.message}</td>
                    <td data-label="Expiry Date">{formatDate(alert.expiry_date)}</td>
                    <td data-label="Stock" style={{ fontWeight: 700 }}>{alert.current_stock} Units</td>
                    <td data-label="Status">
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {getStatusLabel(alert.alert_type)}
                      </span>
                    </td>
                    <td data-label="Priority">{getPriorityBadge(alert.priority)}</td>
                    <td data-label="Actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-secondary btn-icon-only" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/batches/${alert.batch_id}`);
                        }}
                        title="View Full Batch Specifications"
                      >
                        <FaEye style={{ color: 'var(--text-muted)' }} />
                      </button>
                      {!alert.is_read && (
                        <button 
                          className="btn btn-secondary btn-icon-only" 
                          onClick={(e) => handleMarkRead(e, alert.id)}
                          title="Dismiss Alert"
                        >
                          <FaCheck style={{ color: 'var(--success)' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
