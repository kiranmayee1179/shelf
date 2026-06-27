import React from 'react';
import { FaExclamationTriangle, FaHourglassHalf, FaCalendarTimes, FaCalendarDay } from 'react-icons/fa';

const AlertCard = ({ alert }) => {
  const { product_name, batch_number, alert_type, remaining_days, current_stock, expiry_date } = alert;

  const getAlertConfig = () => {
    switch (alert_type) {
      case 'expired':
        return {
          title: 'Batch Expired',
          variant: 'danger',
          icon: <FaCalendarTimes />,
          message: `Product "${product_name}" (Batch: ${batch_number}) has expired! Please write off ${current_stock} units immediately.`
        };
      case 'tomorrow':
        return {
          title: 'Expires Tomorrow',
          variant: 'danger',
          icon: <FaCalendarDay />,
          message: `Batch ${batch_number} of "${product_name}" expires in less than 24 hours. Consume ${current_stock} units immediately!`
        };
      case '7_days':
        return {
          title: 'Critical Expiry (7 Days)',
          variant: 'warning',
          icon: <FaExclamationTriangle />,
          message: `Batch ${batch_number} of "${product_name}" expires in ${remaining_days} days. Ensure priority FEFO routing.`
        };
      case '30_days':
      default:
        return {
          title: 'Upcoming Expiry (30 Days)',
          variant: 'info',
          icon: <FaHourglassHalf />,
          message: `Batch ${batch_number} of "${product_name}" expires in ${remaining_days} days. Total stock: ${current_stock} units.`
        };
    }
  };

  const config = getAlertConfig();
  const formattedDate = new Date(expiry_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className={`alert-banner ${config.variant}`}>
      <span className="alert-banner-icon">{config.icon}</span>
      <div className="alert-banner-content">
        <div className="alert-banner-title">
          {config.title} <span style={{ fontWeight: 400, opacity: 0.8, fontSize: '0.8rem' }}>(Expires: {formattedDate})</span>
        </div>
        <div className="alert-banner-message">{config.message}</div>
      </div>
    </div>
  );
};

export default AlertCard;
