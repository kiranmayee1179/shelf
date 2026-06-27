import React from 'react';

const DashboardCard = ({ label, value, icon, variant = 'primary', onClick }) => {
  return (
    <div
      className={`stat-card ${variant}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
      <div className="stat-icon-wrapper">
        {icon}
      </div>
    </div>
  );
};

export default DashboardCard;
