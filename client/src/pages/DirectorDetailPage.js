import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, CircularProgress, Paper,
  Divider, Box, List, ListItem, ListItemText,
  Button, Snackbar, Alert, Card, CardContent, CardActionArea
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MovieIcon from '@mui/icons-material/Movie';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const DirectorDetailPage = () => {
  const { directorId } = useParams();
  const navigate = useNavigate();
  const [director, setDirector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inFavorites, setInFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    const loadDirector = async () => {
      try {
        console.log(`Loading director with ID: ${directorId}`);
        const response = await api.get(`/api/directors/${directorId}`);
        
        if (!response.data || !response.data.director) {
          throw new Error('Director data not found in response');
        }
        
        const data = response.data.director;
        console.log("Raw director data:", data);

        // Process movies to ensure awards are properly structured
        if (data && data.movies) {
          // Deduplicate movies based on tconst
          const deduplicatedMovies = {};
          for (const movie of data.movies) {
            if (!movie || !movie.tconst) continue; // Skip invalid movies
            
            if (!deduplicatedMovies[movie.tconst]) {
              deduplicatedMovies[movie.tconst] = {
                ...movie,
                awards: []
              };
            }
            
            // Add awards if they exist
            if (movie.awards && Array.isArray(movie.awards)) {
              const existing = deduplicatedMovies[movie.tconst].awards.map(a => 
                a ? `${a.category}-${a.year}` : ''
              );
              
              for (const award of movie.awards) {
                // Skip null awards
                if (!award) continue;
                const key = `${award.category}-${award.year}`;
                if (!existing.includes(key)) {
                  deduplicatedMovies[movie.tconst].awards.push(award);
                }
              }
            }
          }

          // Convert back to array and sort by year (newest first)
          data.movies = Object.values(deduplicatedMovies)
            .filter(movie => movie.tconst) // Filter out any invalid movies
            .sort((a, b) => (b.year || 0) - (a.year || 0));
            
          console.log("Processed movies:", data.movies);
        }
        
        setDirector(data);
      } catch (err) {
        console.error('Failed to load director:', err);
        setError(`Failed to load director details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    const loadFavorites = async () => {
      if (!currentUser) return;
      try {
        const response = await api.get('/api/users/favorites?type=directors');
        const favoritesList = response.data.directors || [];
        setFavorites(favoritesList);
        
        // Check if this director is in favorites
        const isInFavorites = favoritesList.some(
          f => f.item_id === parseInt(directorId) || f.item_id === directorId
        );
        setInFavorites(isInFavorites);
      } catch (err) {
        console.error('Failed to load favorites:', err);
      }
    };

    loadDirector();
    loadFavorites();
  }, [directorId, currentUser]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'Please log in to add favorites',
        severity: 'info'
      });
      return;
    }

    try {
      if (inFavorites) {
        // Find the favorite_id
        const favorite = favorites.find(f => 
          f.item_id === parseInt(directorId) || f.item_id === directorId
        );
        if (favorite) {
          await api.delete(`/api/users/favorites/${favorite.favorite_id}`);
          setSnackbar({
            open: true,
            message: 'Removed from favorites',
            severity: 'success'
          });
          setInFavorites(false);
        }
      } else {
        await api.post('/api/users/favorites/directors', { 
          itemId: parseInt(directorId) || directorId
        });
        setSnackbar({
          open: true,
          message: 'Added to favorites',
          severity: 'success'
        });
        setInFavorites(true);
      }
    } catch (err) {
      console.error('Failed to update favorites:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update favorites',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const navigateToFilm = (filmId) => {
    if (!filmId) return;
    navigate(`/films/${filmId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !director) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Director not found.'}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>{director.name}</Typography>
          <Button 
            variant={inFavorites ? "contained" : "outlined"}
            color="secondary"
            startIcon={inFavorites ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            onClick={handleToggleFavorite}
          >
            {inFavorites ? 'In Favorites' : 'Add to Favorites'}
          </Button>
        </Box>
        
        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle1">Average Rating: {director.averagerating ? parseFloat(director.averagerating).toFixed(2) : 'N/A'}</Typography>
          <Typography variant="subtitle1">Total Awards: {director.totalawards || 0}</Typography>
          <Typography variant="subtitle1">
            Total Box Office: {director.totalboxoffice > 0 ? `$${Number(director.totalboxoffice).toLocaleString()}` : 'Unknown'}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />
        <Typography variant="h6">Filmography ({director.movies?.length || 0} films)</Typography>

        <Box sx={{ maxHeight: '600px', overflow: 'auto' }}>
          {director.movies && director.movies.length > 0 ? (
            director.movies.map((movie, idx) => (
              <Card key={idx} sx={{ my: 2, cursor: 'pointer' }}>
                <CardActionArea onClick={() => navigateToFilm(movie.tconst)}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <MovieIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="subtitle1">
                        <strong>{movie.title}</strong> ({movie.year || 'N/A'})
                      </Typography>
                    </Box>
                    <Typography>Rating: {movie.averagerating ? parseFloat(movie.averagerating).toFixed(1) : 'N/A'}</Typography>
                    <Typography>
                      Revenue: {movie.revenue && movie.revenue > 0 ? `$${Number(movie.revenue).toLocaleString()}` : 'Unknown'}
                    </Typography>

                    {movie.awards && movie.awards.length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>Awards:</Typography>
                        <List dense>
                          {movie.awards.map((award, i) => (
                            award && (
                              <ListItem key={i}>
                                <ListItemText
                                  primary={`${award.category} (${award.year}) - ${award.iswinner ? 'Winner' : 'Nominated'}`}
                                />
                              </ListItem>
                            )
                          ))}
                        </List>
                      </>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            ))
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No films found for this director.
            </Alert>
          )}
        </Box>
      </Paper>

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

export default DirectorDetailPage;