import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// Components
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DirectorPage from './pages/DirectorPage';
import DirectorDetailPage from './pages/DirectorDetailPage';
import ActorPage from './pages/ActorPage';
import ActorDetailPage from './pages/ActorDetailPage';
import GenrePage from './pages/GenrePage';
import FilmPage from './pages/FilmPage';
import FilmDetailPage from './pages/FilmDetailPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfile from './pages/UserProfile';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 2
      },
      styleOverrides: {
        root: {
          padding: '16px'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none'
        }
      }
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Navigation />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<UserProfile />} />
              {/* Add other protected routes here */}
            </Route>
            
            {/* Semi-public routes - can be accessed without login */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Director routes */}
            <Route path="/directors" element={<DirectorPage />} />
            <Route path="/directors/:directorId" element={<DirectorDetailPage />} />
            
            {/* Actor routes */}
            <Route path="/actors" element={<ActorPage />} />
            <Route path="/actors/:actorId" element={<ActorDetailPage />} />
            
            {/* Genre routes */}
            <Route path="/genres" element={<GenrePage />} />
            <Route path="/genres/:genreName" element={<GenrePage />} />
            
            {/* Film routes */}
            <Route path="/films" element={<FilmPage />} />
            <Route path="/films/:filmId" element={<FilmDetailPage />} />
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all route - 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;