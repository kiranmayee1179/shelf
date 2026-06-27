import axios from 'axios';
import { handleMockRequest, initMockData } from './mockService';

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

const shouldUseMock = () => {
  if (localStorage.getItem('use_client_mock') === 'true') {
    return true;
  }
  
  // Auto-detect GitHub Pages and enable mock if no production backend is configured
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  if (isGitHubPages) {
    const apiURL = import.meta.env.VITE_API_URL || '';
    const isLocalBackend = !apiURL || apiURL.includes('localhost') || apiURL.includes('127.0.0.1');
    if (isLocalBackend) {
      return true;
    }
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
    // If there is no response, it is a connection-level error (mixed content block, CORS block, or server down)
    const isConnectionError = !error.response;
    
    if (isConnectionError) {
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

export default API;
