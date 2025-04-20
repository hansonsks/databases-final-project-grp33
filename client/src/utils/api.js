import axios from 'axios';
import config from '../config.json';

const API_URL = `http://${config.server_host}:${config.server_port}`;

// Create axios instance with no timeout
const api = axios.create({
  baseURL: API_URL,
  // Removed timeout completely to allow any query duration
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

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Actor-related API calls
export const fetchTopActors = async (sortBy = 'ratings', limit = 10) => {
  const response = await api.get(`/api/actors/top`, {
    params: { sortBy, limit }
  });
  return response.data.actors;
};

export const fetchActorDetails = async (actorId) => {
  const response = await api.get(`/api/actors/${actorId}`);
  return response.data.actor;
};

export const fetchActorsByDecade = async (decade, limit = 10) => {
  const response = await api.get(`/api/actors/by-decade`, {
    params: { decade, limit }
  });
  return response.data.decades;
};

// Director-related API calls
export const fetchTopDirectors = async (sortBy = 'ratings', limit = 10) => {
  const response = await api.get(`/api/directors/top`, {
    params: { sortBy, limit }
  });
  return response.data.directors;
};

export const fetchDirectorDetails = async (directorId) => {
  const response = await api.get(`/api/directors/${directorId}`);
  return response.data.director;
};

export const fetchDirectorsByDecade = async (decade, limit = 10) => {
  const response = await api.get(`/api/directors/by-decade`, {
    params: { decade, limit }
  });
  return response.data.decades;
};

// Film-related API calls
export const fetchFilmsByActor = async (actorName) => {
  const response = await api.get(`/api/films/by-actor/${encodeURIComponent(actorName)}`);
  return response.data.films;
};

export const fetchTopFilmsByGenre = async (genreName, limit = 10) => {
  const response = await api.get(`/api/films/top-by-genre/${encodeURIComponent(genreName)}`, {
    params: { limit }
  });
  return response.data.films;
};

export const fetchFilmsWithHighestROI = async (yearStart, yearEnd, limit = 10) => {
  const response = await api.get(`/api/films/highest-roi`, {
    params: { yearStart, yearEnd, limit }
  });
  return response.data.films;
};

// Favorites-related API calls
export const addToFavorites = async (type, itemId) => {
  try {
    const response = await api.post(`/api/users/favorites/${type}`, { itemId });
    return response.data;
  } catch (error) {
    // Handle case where it's already in favorites
    if (error.response && error.response.status === 400) {
      return { error: 'Already in favorites' };
    }
    throw error;
  }
};

export const removeFavorite = async (favoriteId) => {
  const response = await api.delete(`/api/users/favorites/${favoriteId}`);
  return response.data;
};

export const getFavorites = async (type) => {
  const params = type ? { type } : {};
  const response = await api.get('/api/users/favorites', { params });
  return response.data;
};

// Dashboard data
export const getDashboardData = async () => {
  const response = await api.get('/api/dashboard');
  return response.data;
};

// Check if server is up
export const checkServerHealth = async () => {
  try {
    const response = await api.get('/api/health');
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('Server health check failed:', error);
    return false;
  }
};

export default api;