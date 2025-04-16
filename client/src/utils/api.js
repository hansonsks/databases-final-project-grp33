import axios from 'axios';
import config from '../config.json';

const API_URL = `http://${config.server_host}:${config.server_port}`;

const api = axios.create({
  baseURL: API_URL
});

// Request interceptor for adding the auth token
api.interceptors.request.use(
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

export default api;