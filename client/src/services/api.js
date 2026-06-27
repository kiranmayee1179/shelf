import axios from 'axios';
import { handleMockRequest, initMockData } from './mockService';

// Force clear use_client_mock and clean up offline mock sessions
(function() {
  if (typeof window !== 'undefined') {
    const isGitHubPages = window.location.hostname.includes('github.io');
    const apiURL = import.meta.env.VITE_API_URL || '';
    const isRealBackend = apiURL && !apiURL.includes('localhost') && !apiURL.includes('127.0.0.1');
    if (isGitHubPages && isRealBackend) {
      localStorage.removeItem('use_client_mock');
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          // If the cached user is not one of the live seeded accounts, force logout
          if (parsed.email && parsed.email !== 'admin@example.com' && parsed.email !== 'agentuser@example.com') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (e) {}
      }
    }
  }
})();

// Determine baseURL based on env
let baseURL = import.meta.env.VITE_API_URL;

// Ensure API URL is not localhost in production, unless hosted on GitHub Pages
if (import.meta.env.PROD) {
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  if (!isGitHubPages) {
    if (!baseURL || baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
      baseURL = '/api';
    }
  }
} else {
  // Local development fallback
  if (!baseURL) {
    baseURL = 'http://localhost:5001/api';
  }
}

// Normalize baseURL to ensure it ends with '/api' (or '/api/')
if (baseURL && baseURL !== '/api' && !baseURL.endsWith('/api') && !baseURL.endsWith('/api/')) {
  baseURL = baseURL.replace(/\/$/, '') + '/api';
}

// Automatically check if the backend is reachable and disable client-side mock if it is
(async () => {
  if (typeof window !== 'undefined' && localStorage.getItem('use_client_mock') === 'true') {
    try {
      const ping = axios.create({
        baseURL,
        timeout: 2000
      });
      await ping.get(''); 
      console.log('[API] Backend server is reachable! Disabling offline client mock.');
      localStorage.removeItem('use_client_mock');
    } catch (e) {
      console.log('[API] Backend server is still unreachable. Keeping offline mock active.');
    }
  }
})();

const shouldUseMock = () => {
  // Always disable mock on GitHub Pages if a real production backend is configured
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  if (isGitHubPages) {
    const apiURL = import.meta.env.VITE_API_URL || '';
    const isLocalBackend = !apiURL || apiURL.includes('localhost') || apiURL.includes('127.0.0.1');
    if (isLocalBackend) {
      return true;
    }
    return false;
  }

  if (localStorage.getItem('use_client_mock') === 'true') {
    return true;
  }
  return false;
};

const customAdapter = async (config) => {
  if (shouldUseMock()) {
    console.log('[Mock API] Handling request:', config.method?.toUpperCase(), config.url);
    return handleMockRequest(config);
  }

  try {
    let defaultAdapter = axios.defaults.adapter;
    if (typeof axios.getAdapter === 'function') {
      defaultAdapter = axios.getAdapter(defaultAdapter);
    }
    if (typeof defaultAdapter !== 'function') {
      throw new Error('Default axios adapter not found or is not a function');
    }
    return await defaultAdapter(config);
  } catch (error) {
    const isConnectionError = !error.response;
    const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
    const apiURL = import.meta.env.VITE_API_URL || '';
    const isRealBackend = apiURL && !apiURL.includes('localhost') && !apiURL.includes('127.0.0.1');
    
    // Only activate offline client mock if we are not on GitHub Pages with a real backend
    if (isConnectionError && (!isGitHubPages || !isRealBackend)) {
      console.warn('[API Warning] Backend server is unreachable. Activating Client-Side Mock Database...');
      localStorage.setItem('use_client_mock', 'true');
      initMockData();
      return handleMockRequest(config);
    }
    throw error;
  }
};

const API = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  adapter: customAdapter
});

// Interceptor to inject JWT token in header
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle responses and log out if 401 Unauthorized occurs
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API] Received 401 Unauthorized. Clearing local token and session...');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.hash = '#/login'; // Redirect to login
      }
    }
    return Promise.reject(error);
  }
);

export default API;
