import axios from 'axios';

// Determine baseURL based on env
let baseURL = import.meta.env.VITE_API_URL;

// Ensure API URL is not localhost in production
if (import.meta.env.PROD) {
  if (!baseURL || baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
    baseURL = '/api';
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

const API = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
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
