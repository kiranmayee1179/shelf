import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FaThLarge, 
  FaLayerGroup, 
  FaBell, 
  FaSignOutAlt,
  FaShieldAlt,
  FaCog,
  FaFileAlt,
  FaBoxes
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <FaThLarge /> },
    { name: 'Preserved Foods', path: '/preserved-foods', icon: <FaBoxes /> },
    { name: 'Batches', path: '/batches', icon: <FaLayerGroup /> },
    { name: 'Alerts', path: '/alerts', icon: <FaBell /> },
    { name: 'Reports', path: '/reports', icon: <FaFileAlt /> },
    { name: 'Settings', path: '/settings', icon: <FaCog /> },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
        <NavLink to="/dashboard" className="sidebar-brand" style={{ marginBottom: 0 }}>
          <FaShieldAlt className="sidebar-logo-icon" />
          <span>Sharadha Stores</span>
        </NavLink>
        <button 
          onClick={onClose}
          className="sidebar-close-btn"
          style={{
            display: 'block',
            background: 'none',
            border: 'none',
            color: '#ffffff',
            fontSize: '1.75rem',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1
          }}
        >
          &times;
        </button>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li key={item.name} onClick={onClose}>
            <NavLink 
              to={item.path} 
              className={({ isActive }) => 
                isActive ? 'sidebar-item-link active' : 'sidebar-item-link'
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {getInitials(user.fullName)}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.fullName}</span>
              <span className="sidebar-user-role">{user.role}</span>
            </div>
          </div>
        )}
        <button onClick={logout} className="btn-logout">
          <FaSignOutAlt />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
