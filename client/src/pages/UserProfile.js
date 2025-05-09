import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  IconButton,
  Tabs,
  Tab,
  Snackbar
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
  const [favoriteTab, setFavoriteTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const profileRes = await api.get('/api/users/profile');
        setProfile(profileRes.data);
        setFormData({
          name: profileRes.data.name || '',
          email: profileRes.data.email || ''
        });
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

  // Fetch favorites with additional data for display
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!currentUser) return;
      
      try {
        setLoadingFavorites(true);
        const favoritesRes = await api.get('/api/users/favorites');
        
        // Enhance favorites data with names where needed
        const actorsWithNames = await enhanceFavorites(favoritesRes.data.actors || [], 'actor');
        const directorsWithNames = await enhanceFavorites(favoritesRes.data.directors || [], 'director');
        const filmsWithNames = await enhanceFavorites(favoritesRes.data.films || [], 'film');
        
        setFavorites({
          actors: actorsWithNames,
          directors: directorsWithNames,
          films: filmsWithNames
        });
      } catch (err) {
        console.error('Failed to load favorites:', err);
        setSnackbar({
          open: true,
          message: 'Failed to load favorites data',
          severity: 'error'
        });
      } finally {
        setLoadingFavorites(false);
      }
    };

    fetchFavorites();
  }, [currentUser]);

  // Function to fetch additional data for favorites (names, etc.)
  const enhanceFavorites = async (items, type) => {
    if (!items || items.length === 0) return [];
    
    try {
      // For each favorite, enhance with additional data if needed
      const enhancedItems = await Promise.all(
        items.map(async (item) => {
          // If the item already has a name or title, use it
          if (item.name || item.title || item.primaryname || item.director_name) {
            return item;
          }
          
          // Otherwise, fetch the details based on type
          try {
            let details = {};
            
            if (type === 'actor') {
              // For actors, fetch from actor detail endpoint
              try {
                const response = await api.get(`/api/actors/${item.item_id}`);
                if (response.data && response.data.actor) {
                  details = {
                    name: response.data.actor.name || response.data.actor.primaryname
                  };
                }
              } catch (err) {
                console.error(`Error fetching actor ${item.item_id}:`, err);
                
                // Try an alternate method - fetch from top actors
                try {
                  const topResponse = await api.get('/api/actors/top?limit=100');
                  const foundActor = topResponse.data.actors.find(
                    actor => actor.nconst === item.item_id || actor.nconst === parseInt(item.item_id)
                  );
                  if (foundActor) {
                    details = {
                      name: foundActor.primaryname
                    };
                  }
                } catch (altErr) {
                  console.error('Alternative lookup failed:', altErr);
                }
              }
            } else if (type === 'director') {
              // For directors, fetch from director detail endpoint
              try {
                const response = await api.get(`/api/directors/${item.item_id}`);
                if (response.data && response.data.director) {
                  details = {
                    name: response.data.director.name || response.data.director.primaryname
                  };
                }
              } catch (err) {
                console.error(`Error fetching director ${item.item_id}:`, err);
                
                // Try an alternate method - fetch from top directors
                try {
                  const topResponse = await api.get('/api/directors/top?limit=100');
                  const foundDirector = topResponse.data.directors.find(
                    director => director.nconst === item.item_id || director.nconst === parseInt(item.item_id)
                  );
                  if (foundDirector) {
                    details = {
                      name: foundDirector.primaryname
                    };
                  }
                } catch (altErr) {
                  console.error('Alternative lookup failed:', altErr);
                }
              }
            } else if (type === 'film') {
              // For films, try several approaches
              try {
                // First attempt: check if film data is in highest ROI films
                const roiResponse = await api.get('/api/films/highest-roi');
                let foundFilm = null;
                
                if (roiResponse.data.films) {
                  foundFilm = roiResponse.data.films.find(
                    film => film.tconst === item.item_id || film.tconst === parseInt(item.item_id)
                  );
                } else if (roiResponse.data.years) {
                  // Alternative format with years
                  for (const yearData of roiResponse.data.years) {
                    if (yearData.film && (yearData.film.tconst === item.item_id || 
                                         yearData.film.tconst === parseInt(item.item_id))) {
                      foundFilm = yearData.film;
                      break;
                    }
                  }
                }
                
                if (foundFilm) {
                  details = {
                    title: foundFilm.title || foundFilm.film_title || foundFilm.primarytitle,
                    year: foundFilm.year || foundFilm.startyear
                  };
                } else {
                  // Try to fetch by genre as fallback
                  const genreResponse = await api.get(`/api/films/top-by-genre/Drama`);
                  if (genreResponse.data && genreResponse.data.films) {
                    foundFilm = genreResponse.data.films.find(
                      film => film.tconst === item.item_id || film.tconst === parseInt(item.item_id)
                    );
                    
                    if (foundFilm) {
                      details = {
                        title: foundFilm.title || foundFilm.primarytitle,
                        year: foundFilm.year || foundFilm.startyear
                      };
                    }
                  }
                }
              } catch (err) {
                console.error(`Error fetching film ${item.item_id}:`, err);
              }
              
              // If we still don't have details, use a placeholder
              if (!details.title) {
                details = {
                  title: `Film #${item.item_id}`,
                  year: null
                };
              }
            }
            
            return { ...item, ...details };
          } catch (err) {
            console.error(`Failed to fetch details for ${type} #${item.item_id}:`, err);
            // Return the original item if we couldn't enhance it
            return item;
          }
        })
      );
      
      return enhancedItems;
    } catch (err) {
      console.error(`Failed to enhance ${type} favorites:`, err);
      return items; // Return original items on error
    }
  };

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
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to update profile',
        severity: 'error'
      });
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
          updated[type] = prev[type].filter(item => item.favorite_id !== favoriteId);
        });
        return updated;
      });
      
      setSnackbar({
        open: true,
        message: 'Item removed from favorites',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to remove from favorites',
        severity: 'error'
      });
    }
  };

  const handleFavoriteTabChange = (_, newValue) => {
    setFavoriteTab(newValue);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
        <Grid item xs={12}>
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
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
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
                </Grid>
                <Grid item xs={12} sm={6}>
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
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="normal"
                    fullWidth
                    id="username"
                    label="Username"
                    name="username"
                    value={profile?.username || ''}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="normal"
                    fullWidth
                    id="joinDate"
                    label="Member Since"
                    name="joinDate"
                    value={new Date(profile?.joinDate).toLocaleDateString()}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={updating}
                  >
                    {updating ? 'Updating...' : 'Update Profile'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
        
        {/* Favorites */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" gutterBottom>
              Your Favorites
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Chip 
                icon={<PersonIcon />} 
                label={`${favorites.actors?.length || 0} Actors`} 
                color="primary" 
                variant={favoriteTab === 0 ? "filled" : "outlined"}
                onClick={() => setFavoriteTab(0)}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip 
                icon={<DirectorChairIcon />} 
                label={`${favorites.directors?.length || 0} Directors`} 
                color="secondary" 
                variant={favoriteTab === 1 ? "filled" : "outlined"}
                onClick={() => setFavoriteTab(1)}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip 
                icon={<MovieIcon />} 
                label={`${favorites.films?.length || 0} Films`} 
                color="info" 
                variant={favoriteTab === 2 ? "filled" : "outlined"}
                onClick={() => setFavoriteTab(2)}
                sx={{ mb: 1 }}
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 400, overflow: 'hidden' }}>
              {loadingFavorites ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {/* Actors Tab */}
                  {favoriteTab === 0 && (
                    <Box sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 400 }}>
                      {favorites.actors?.length > 0 ? (
                        <List>
                          {favorites.actors.map((actor) => (
                            <ListItem
                              key={actor.favorite_id || actor.item_id}
                              secondaryAction={
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete"
                                  onClick={() => handleRemoveFavorite(actor.favorite_id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              }
                            >
                              <ListItemAvatar>
                                <Avatar component={RouterLink} to={`/actors/${actor.item_id}`}>
                                  <PersonIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText 
                                primary={
                                  <RouterLink to={`/actors/${actor.item_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    {actor.name || actor.primaryname || "Unknown Actor"}
                                  </RouterLink>
                                } 
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
                          <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                          <Typography variant="body1" align="center" color="text.secondary">
                            You haven't added any actors to your favorites yet.
                          </Typography>
                          <Button 
                            variant="contained" 
                            component={RouterLink}
                            to="/actors"
                            sx={{ mt: 2 }}
                          >
                            Browse Actors
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {/* Directors Tab */}
                  {favoriteTab === 1 && (
                    <Box sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 400 }}>
                      {favorites.directors?.length > 0 ? (
                        <List>
                          {favorites.directors.map((director) => (
                            <ListItem
                              key={director.favorite_id || director.item_id}
                              secondaryAction={
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete"
                                  onClick={() => handleRemoveFavorite(director.favorite_id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              }
                            >
                              <ListItemAvatar>
                                <Avatar component={RouterLink} to={`/directors/${director.item_id}`}>
                                  <DirectorChairIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText 
                                primary={
                                  <RouterLink to={`/directors/${director.item_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    {director.name || director.primaryname || "Unknown Director"}
                                  </RouterLink>
                                } 
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
                          <DirectorChairIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                          <Typography variant="body1" align="center" color="text.secondary">
                            You haven't added any directors to your favorites yet.
                          </Typography>
                          <Button 
                            variant="contained" 
                            component={RouterLink}
                            to="/directors"
                            sx={{ mt: 2 }}
                          >
                            Browse Directors
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {/* Films Tab */}
                  {favoriteTab === 2 && (
                    <Box sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 400 }}>
                      {favorites.films?.length > 0 ? (
                        <List>
                          {favorites.films.map((film) => (
                            <ListItem
                              key={film.favorite_id || film.item_id}
                              secondaryAction={
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete"
                                  onClick={() => handleRemoveFavorite(film.favorite_id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              }
                            >
                              <ListItemAvatar>
                                <Avatar component={RouterLink} to={`/films/${film.item_id}`}>
                                  <MovieIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText 
                                primary={
                                  <RouterLink to={`/films/${film.item_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    {film.title || film.primarytitle || "Unknown Film"}
                                  </RouterLink>
                                }
                                secondary={film.year ? `(${film.year})` : ''} 
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
                          <MovieIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                          <Typography variant="body1" align="center" color="text.secondary">
                            You haven't added any films to your favorites yet.
                          </Typography>
                          <Button 
                            variant="contained" 
                            component={RouterLink}
                            to="/films"
                            sx={{ mt: 2 }}
                          >
                            Browse Films
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {(favorites.actors?.length === 0 && 
                    favorites.directors?.length === 0 && 
                    favorites.films?.length === 0) && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Favorites Yet
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 2, textAlign: 'center', maxWidth: '80%', color: 'text.secondary' }}>
                        Start building your collection by exploring actors, directors, and films and adding them to your favorites!
                      </Typography>
                      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button 
                          variant="contained" 
                          component={RouterLink} 
                          to="/actors"
                          startIcon={<PersonIcon />}
                        >
                          Actors
                        </Button>
                        <Button 
                          variant="contained" 
                          component={RouterLink} 
                          to="/directors"
                          startIcon={<DirectorChairIcon />}
                        >
                          Directors
                        </Button>
                        <Button 
                          variant="contained" 
                          component={RouterLink} 
                          to="/films"
                          startIcon={<MovieIcon />}
                        >
                          Films
                        </Button>
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserProfile;