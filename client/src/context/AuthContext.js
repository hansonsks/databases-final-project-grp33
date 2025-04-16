import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const userData = JSON.parse(localStorage.getItem('userData'));
      setCurrentUser(userData);
    }
    setLoading(false);
  }, []);

  const register = async (username, email, password, name) => {
    try {
      setError(null);
      const response = await axios.post('/auth/register', {
        username,
        email,
        password,
        name
      });
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userData', JSON.stringify({
        userId: response.data.userId,
        username: response.data.username,
        name: response.data.name
      }));
      
      setCurrentUser({
        userId: response.data.userId,
        username: response.data.username,
        name: response.data.name
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      throw err;
    }
  };

  const login = async (username, password) => {
    try {
      setError(null);
      const response = await axios.post('/auth/login', {
        username,
        password
      });
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userData', JSON.stringify({
        userId: response.data.userId,
        username: response.data.username,
        name: response.data.name
      }));
      
      setCurrentUser({
        userId: response.data.userId,
        username: response.data.username,
        name: response.data.name
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        error,
        register,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};