import API from './api';

const authService = {
  login: async (email, password) => {
    try {
      const response = await API.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      console.error('API login request failed:', error.message);
      throw error;
    }
  },

  signup: async (fullName, email, password, confirmPassword) => {
    try {
      const response = await API.post('/auth/signup', {
        fullName,
        email,
        password,
        confirmPassword
      });
      return response.data;
    } catch (error) {
      console.error('API signup request failed:', error.message);
      throw error;
    }
  },

  googleLogin: async (credential) => {
    try {
      const response = await API.post('/auth/google', { credential });
      return response.data;
    } catch (error) {
      console.error('API Google auth request failed:', error.message);
      throw error;
    }
  }
};

export default authService;
