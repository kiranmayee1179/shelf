import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaGoogle, FaUser, FaEnvelope, FaLock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const navigate = useNavigate();
  const { signup, googleLogin, isAuthenticated } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setSubmitting(true);
    try {
      await signup(fullName, email, password, confirmPassword);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setSubmitting(true);
    try {
      const mockHeader = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const mockPayload = btoa(JSON.stringify({
        email: "google-demo-user@example.com",
        name: "Google Demo User",
        sub: "google-sub-123456789",
        email_verified: true
      }));
      const mockSignature = "dummy-signature";
      const mockCredential = `${mockHeader}.${mockPayload}.${mockSignature}`;

      await googleLogin(mockCredential);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Google signup failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-side">
        <Link to="/" className="auth-logo">
          <FaShieldAlt className="auth-logo-icon" />
          <span>Shelf Life Co.</span>
        </Link>

        <div className="auth-header-text">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">
            Already registered? <Link to="/login">Sign in here</Link>
          </p>
        </div>

        {error && (
          <div className="alert-banner danger" style={{ margin: '0 0 1.5rem 0', padding: '0.75rem' }}>
            <div className="alert-banner-message">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name-input">Full Name</label>
            <div style={{ position: 'relative' }}>
              <FaUser style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                id="name-input"
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '2.75rem' }}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <FaEnvelope style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                id="signup-email"
                type="email" 
                className="form-input" 
                style={{ paddingLeft: '2.75rem' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">Password</label>
            <div style={{ position: 'relative' }}>
              <FaLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                id="signup-password"
                type="password" 
                className="form-input" 
                style={{ paddingLeft: '2.75rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength="6"
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
                placeholder="Repeat password"
                minLength="6"
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
            {submitting ? 'Registering...' : 'Sign Up'}
          </button>

          <div className="auth-divider">or register with</div>

          <button 
            type="button" 
            className="btn-google" 
            onClick={handleGoogleSignUp}
            disabled={submitting}
          >
            <FaGoogle className="btn-google-icon" />
            <span>Sign Up with Google</span>
          </button>
        </form>
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

export default Signup;
