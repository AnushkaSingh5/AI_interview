import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // allows cookies to be sent/received
});

// Request Interceptor: Automatically attach the token if it exists in localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle errors globally (e.g. 401 Unauthorized)
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If the error response status is 401, token might be expired/invalid
    if (error.response && error.response.status === 401) {
      // Clear token and user details from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Dispatch a custom event to notify AuthContext to log out user
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
