import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';
import API from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedToken && storedUser) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      const syncOfflineData = async () => {
        try {
          const mockBatchesStr = localStorage.getItem('mock_batches');
          if (mockBatchesStr) {
            const mockBatches = JSON.parse(mockBatchesStr);
            // Batches with ID > 16 are user-created offline batches
            const userBatches = mockBatches.filter(b => b.id > 16);
            if (userBatches.length > 0) {
              console.log(`[Sync] Found ${userBatches.length} offline batches to synchronize...`);
              
              for (const batch of userBatches) {
                try {
                  console.log(`[Sync] Syncing batch: ${batch.product_name}`);
                  await API.post('/batches', {
                    product_name: batch.product_name,
                    category: batch.category,
                    manufacturing_date: batch.manufacturing_date,
                    shelf_life: batch.shelf_life,
                    quantity: batch.quantity,
                    source: batch.source || 'Offline Mode',
                    batch_details: batch.batch_details || 'Added while offline.'
                  });
                } catch (err) {
                  console.error(`[Sync] Failed to sync batch ${batch.product_name}:`, err);
                }
              }
              console.log('[Sync] Offline synchronization complete!');
            }
            // Clear offline mock DB trace so we don't repeat syncing
            localStorage.removeItem('mock_batches');
            localStorage.removeItem('mock_activity_log');
            localStorage.removeItem('mock_alerts');
          }
        } catch (e) {
          console.error('[Sync] Error during data synchronization:', e);
        }
      };
      syncOfflineData();
    }
  }, [token]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    saveAuth(data);
    return data;
  };

  const signup = async (fullName, email, password, confirmPassword) => {
    const data = await authService.signup(fullName, email, password, confirmPassword);
    saveAuth(data);
    return data;
  };

  const googleLogin = async (credential) => {
    const data = await authService.googleLogin(credential);
    saveAuth(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  const saveAuth = (data) => {
    if (data.token && data.user) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setToken(data.token);
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    googleLogin,
    logout,
    isAuthenticated: !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
