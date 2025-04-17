import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import MovieIcon from '@mui/icons-material/Movie';
import DirectorChairIcon from '@mui/icons-material/Chair';
import DeleteIcon from '@mui/icons-material/Delete';

const UserProfile = () => {
  const { currentUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [favorites, setFavorites] = useState({ actors: [], directors: [], films: [] });
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const profileRes = await api.get('/api/users/profile');
        setProfile(profileRes.data);
        setFormData({
          name: profileRes.data.name || '',
          email: profileRes.data.email || ''
        });

        const favoritesRes = await api.get('/api/users/favorites');
        setFavorites(favoritesRes.data);
      } catch (err) {
        setError('Failed to load profile data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchProfileData();
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.put('/api/users/profile', formData);
      setProfile(prev => ({
        ...prev,
        name: res.data.name,
        email: res.data.email
      }));
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId) => {
    try {
      await api.delete(`/api/users/favorites/${favoriteId}`);
      
      // Update the favorites state by removing the deleted item
      setFavorites(prev => {
        const updated = { ...prev };
        ['actors', 'directors', 'films'].forEach(type => {
          updated[type] = prev[type].filter(item => item.favoriteId !== favoriteId);
        });
        return updated;
      });
      
      setSuccess('Item removed from favorites');
    } catch (err) {
      setError('Failed to remove from favorites');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Profile Information
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Full Name"
                name="name"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
              />
              <TextField
                margin="normal"
                fullWidth
                id="username"
                label="Username"
                name="username"
                value={profile?.username || ''}
                disabled
              />
              <TextField
                margin="normal"
                fullWidth
                id="joinDate"
                label="Member Since"
                name="joinDate"
                value={new Date(profile?.joinDate).toLocaleDateString()}
                disabled
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Profile'}
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Favorites */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              Your Favorites
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Chip 
                icon={<PersonIcon />} 
                label={`${favorites.actors.length} Actors`} 
                color="primary" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <Chip 
                icon={<DirectorChairIcon />} 
                label={`${favorites.directors.length} Directors`} 
                color="secondary" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <Chip 
                icon={<MovieIcon />} 
                label={`${favorites.films.length} Films`} 
                color="info" 
                variant="outlined"
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Actors */}
            {favorites.actors.length > 0 && (
              <>
                <Typography variant="subtitle1">Favorite Actors</Typography>
                <List>
                  {favorites.actors.map((actor) => (
                    <ListItem
                      key={actor.favoriteId}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleRemoveFavorite(actor.favoriteId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={actor.name} />
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ my: 2 }} />
              </>
            )}
            
            {/* Directors */}
            {favorites.directors.length > 0 && (
              <>
                <Typography variant="subtitle1">Favorite Directors</Typography>
                <List>
                  {favorites.directors.map((director) => (
                    <ListItem
                      key={director.favoriteId}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleRemoveFavorite(director.favoriteId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <DirectorChairIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={director.name} />
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ my: 2 }} />
              </>
            )}
            
            {/* Films */}
            {favorites.films.length > 0 && (
              <>
                <Typography variant="subtitle1">Favorite Films</Typography>
                <List>
                  {favorites.films.map((film) => (
                    <ListItem
                      key={film.favoriteId}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleRemoveFavorite(film.favoriteId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <MovieIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={film.title} 
                        secondary={film.year ? `(${film.year})` : ''} 
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
            
            {favorites.actors.length === 0 && 
             favorites.directors.length === 0 && 
             favorites.films.length === 0 && (
              <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
                You haven't added any favorites yet. Browse the site and add some!
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UserProfile;