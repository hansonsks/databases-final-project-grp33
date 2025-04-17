import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

/**
 * Protected route component that redirects to login page
 * if the user is not authenticated
 */
const ProtectedRoute = () => {
  const { currentUser, loading } = useContext(AuthContext);

  // Show loading indicator while checking authentication status
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if user is not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Render the child routes if user is authenticated
  return <Outlet />;
};

export default ProtectedRoute;