import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaShieldAlt, FaLock } from 'react-icons/fa';
import axios from 'axios';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  let token = searchParams.get('token');
  if (!token) {
    const tokenMatch = window.location.hash.match(/token=([^&]+)/);
    token = tokenMatch ? tokenMatch[1] : null;
  }

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Password reset token is missing. Please request a new link.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        password
      });

      setSuccess(response.data?.message || 'Password reset successfully!');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to reset password. The token may be invalid or expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-side">
        <Link to="/" className="auth-logo">
          <FaShieldAlt style={{ fontSize: '1.75rem', color: 'var(--primary-color)' }} />
          <span>ShelfLife</span>
        </Link>

        <h1 className="auth-title">Reset Your Password</h1>
        <p className="auth-subtitle">Enter your new secure password below.</p>

        {!token ? (
          <div className="alert-banner danger" style={{ margin: '1.5rem 0' }}>
            <div className="alert-banner-message" style={{ marginBottom: '1rem' }}>
              Password reset token is missing. Please request a new password reset link from the login page.
            </div>
            <Link to="/login" className="btn btn-secondary" style={{ display: 'block', textAlign: 'center', width: '100%' }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="alert-banner danger" style={{ margin: '0 0 1.5rem 0', padding: '0.75rem' }}>
                <div className="alert-banner-message">{error}</div>
              </div>
            )}

            {success && (
              <div className="alert-banner success" style={{ margin: '0 0 1.5rem 0', padding: '0.75rem' }}>
                <div className="alert-banner-message">{success} Redirecting to login...</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">New Password</label>
                <div style={{ position: 'relative' }}>
                  <FaLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="new-password"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <FaLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="confirm-password"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }}
                disabled={submitting}
              >
                {submitting ? 'Resetting...' : 'Update Password'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <Link to="/login" className="forgot-password-link" style={{ fontSize: '0.875rem' }}>
                  Back to Sign In
                </Link>
              </div>
            </form>
          </>
        )}
      </div>

      <div className="auth-banner-side">
        <h2 className="auth-banner-title">Smart Shelf Life & Expiry Reminders</h2>
        <p className="auth-banner-subtitle">
          Optimize your inventory flow using First Expire First Out (FEFO) logic, control wastage metrics, and receive instant alerts before stock turns overdue.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
