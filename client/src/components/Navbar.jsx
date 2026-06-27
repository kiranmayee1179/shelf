import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBell, FaSignOutAlt, FaBars, FaExclamationTriangle, FaCalendarTimes, FaBoxes, FaCheck } from 'react-icons/fa';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  
  const [alertCount, setAlertCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Map path to beautiful readable title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Sharadha Stores - Dashboard';
    if (path.startsWith('/batches')) return 'Stock-by-Batch Table';
    if (path.startsWith('/alerts')) return 'Automated Expiry Alerts';
    return 'Sharadha Stores';
  };

  const fetchAlertsData = async () => {
    try {
      const alertsRes = await API.get('/alerts');
      const allAlerts = Array.isArray(alertsRes.data) ? alertsRes.data : [];
      const unreadAlerts = allAlerts.filter(a => !a.is_read);
      setAlertCount(unreadAlerts.length);
      setRecentAlerts(allAlerts.slice(0, 5));
    } catch (err) {
      console.error('Failed to load alert details in navbar', err);
    }
  };

  useEffect(() => {
    fetchAlertsData();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchAlertsData, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await API.put('/alerts/read-all');
      fetchAlertsData();
    } catch (err) {
      console.error('Failed to mark all alerts as read', err);
    }
  };

  const handleAlertClick = async (alert) => {
    setDropdownOpen(false);
    try {
      if (!alert.is_read) {
        await API.put(`/alerts/${alert.id}/read`);
      }
      fetchAlertsData();
      navigate(`/batches/${alert.batch_id}`);
    } catch (err) {
      console.error('Failed to update alert status', err);
      navigate(`/batches/${alert.batch_id}`);
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'expired':
        return <FaCalendarTimes className="dropdown-item-icon expired" />;
      case 'near_expiry':
        return <FaExclamationTriangle className="dropdown-item-icon near_expiry" />;
      case 'low_stock':
      default:
        return <FaBoxes className="dropdown-item-icon low_stock" />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          className="sidebar-toggle-btn"
          onClick={onMenuClick}
          title="Open Menu"
        >
          <FaBars />
        </button>
        <div className="navbar-title">{getPageTitle()}</div>
      </div>

      <div className="navbar-actions">
        <div className="navbar-badge-btn-wrapper" ref={dropdownRef}>
          <button 
            className="navbar-badge-btn" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Expiry & Stock Alerts"
          >
            <FaBell />
            {alertCount > 0 && (
              <span className="navbar-badge-count">
                {alertCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="navbar-notification-dropdown">
              <div className="dropdown-header">
                <span className="dropdown-title">System Alerts ({alertCount} unread)</span>
                {alertCount > 0 && (
                  <button onClick={handleMarkAllRead} className="btn-mark-all-read">
                    <FaCheck style={{ marginRight: '4px', fontSize: '0.65rem' }} /> Mark all read
                  </button>
                )}
              </div>

              <div className="dropdown-list">
                {recentAlerts.length === 0 ? (
                  <div className="dropdown-empty">All stock systems are healthy. No alerts generated.</div>
                ) : (
                  recentAlerts.map(alert => (
                    <div 
                      key={alert.id} 
                      onClick={() => handleAlertClick(alert)}
                      className={`dropdown-item ${!alert.is_read ? 'unread' : ''}`}
                    >
                      {getAlertIcon(alert.alert_type)}
                      <div className="dropdown-item-content">
                        <span className="dropdown-item-message">{alert.message}</span>
                        <span className="dropdown-item-time">{formatTimeAgo(alert.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="dropdown-footer">
                <a 
                  href="#/alerts" 
                  className="dropdown-view-all"
                  onClick={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    navigate('/alerts');
                  }}
                >
                  View All Alerts
                </a>
              </div>
            </div>
          )}
        </div>
        
        <button 
          className="navbar-badge-btn navbar-logout-btn"
          onClick={handleLogout}
          title="Sign Out"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius)',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--danger)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
          }}
        >
          <FaSignOutAlt />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
