import React, { useState, useEffect } from 'react';
import { FaCog, FaBell, FaUser, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [thresholdDays, setThresholdDays] = useState(5);
  const [alertPoints, setAlertPoints] = useState(['1', '3', '5']);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const availablePoints = [
    { label: '1 Day before expiry', value: '1' },
    { label: '3 Days before expiry', value: '3' },
    { label: '5 Days before expiry', value: '5' },
    { label: '7 Days before expiry', value: '7' },
    { label: '14 Days before expiry', value: '14' },
    { label: '30 Days before expiry', value: '30' }
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await API.get('/auth/settings');
        setThresholdDays(res.data.reminder_threshold_days || 5);
        if (res.data.alert_points) {
          setAlertPoints(res.data.alert_points.split(',').map(s => s.trim()));
        }
      } catch (err) {
        console.error('Failed to load user settings', err);
        setError('Failed to load warning preferences. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleCheckboxChange = (val) => {
    if (alertPoints.includes(val)) {
      setAlertPoints(alertPoints.filter(p => p !== val));
    } else {
      setAlertPoints([...alertPoints, val].sort((a, b) => parseInt(a) - parseInt(b)));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        reminder_threshold_days: thresholdDays,
        alert_points: alertPoints.join(',')
      };

      await API.put('/auth/settings', payload);
      setSuccessMsg('Settings updated successfully. Expiry warning thresholds and dashboard alerts recalculated.');
      
      // Auto-dismiss success message after 4 seconds
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save settings', err);
      setError(err.response?.data?.message || 'Failed to update reminder preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Loading settings preferences...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaCog style={{ color: 'var(--primary)' }} /> System Settings
          </h1>
          <p className="page-header-subtitle">Customize expiry reminder parameters, warnings and display settings</p>
        </div>
      </div>

      {successMsg && (
        <div className="alert-banner success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FaCheck style={{ color: 'var(--success)', flexShrink: 0 }} />
          <div className="alert-banner-message">{successMsg}</div>
        </div>
      )}

      {error && (
        <div className="alert-banner danger" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FaExclamationTriangle style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <div className="alert-banner-message">{error}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Settings Form Card */}
        <form onSubmit={handleSave} className="details-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: Threshold Slider */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontFamily: 'Outfit, sans-serif', color: 'var(--dark)', marginBottom: '0.75rem' }}>
              <FaBell style={{ color: 'var(--primary)' }} /> Expiry Warning Threshold
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Define how many days prior to expiry a batch should be flagged as <strong>"Near Expiry"</strong>. Flagged items will display in yellow/orange alerts on the dashboard.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <input 
                  type="range" 
                  min="1" 
                  max="60" 
                  value={thresholdDays} 
                  onChange={(e) => setThresholdDays(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    accentColor: 'var(--primary)',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  <span>1 day</span>
                  <span>15 days</span>
                  <span>30 days</span>
                  <span>45 days</span>
                  <span>60 days</span>
                </div>
              </div>
              
              <div style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: 'var(--primary-light)',
                borderRadius: '8px',
                border: '1px solid var(--primary-border)',
                textAlign: 'center',
                minWidth: '90px'
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', display: 'block', lineHeight: 1 }}>
                  {thresholdDays}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Days
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Frequency checkboxes */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontFamily: 'Outfit, sans-serif', color: 'var(--dark)', marginBottom: '0.75rem' }}>
              <FaBell style={{ color: 'var(--primary)' }} /> Custom Reminder Timelines
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Trigger push alerts on these specific milestones leading up to product expiration:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {availablePoints.map(point => {
                const isChecked = alertPoints.includes(point.value);
                return (
                  <label 
                    key={point.value} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: `1px solid ${isChecked ? 'var(--primary-border)' : 'var(--border)'}`,
                      backgroundColor: isChecked ? 'rgba(224, 90, 16, 0.03)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCheckboxChange(point.value)}
                      style={{
                        accentColor: 'var(--primary)',
                        transform: 'scale(1.1)'
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: isChecked ? 600 : 500, color: 'var(--dark)' }}>
                      {point.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving}
              style={{ padding: '0.75rem 2rem', fontWeight: 600 }}
            >
              {saving ? 'Saving preferences...' : 'Save Changes'}
            </button>
          </div>

        </form>

        {/* User profile details sidebar panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="details-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 800,
              margin: '0 auto 1rem auto',
              border: '2px solid var(--primary-border)'
            }}>
              {user ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'A'}
            </div>
            
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' }}>
              {user?.fullName || 'Demo Administrator'}
            </h3>
            
            <span style={{ 
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--primary)',
              backgroundColor: 'var(--primary-light)',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              marginBottom: '1rem'
            }}>
              {user?.role || 'Admin'} Role
            </span>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Email Address
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--dark)' }}>
                  {user?.email || 'admin@example.com'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Default Branch
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--dark)' }}>
                  Sharadha Stores - Main
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Settings;
