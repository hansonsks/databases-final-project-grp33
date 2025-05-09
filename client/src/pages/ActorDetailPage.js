import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, CircularProgress, Paper,
  Divider, Box, List, ListItem, ListItemText,
  Button, Snackbar, Alert
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const ActorDetailPage = () => {
  const { actorId } = useParams();
  const navigate = useNavigate();
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inFavorites, setInFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { currentUser } = useContext(AuthContext);
  const navigateToFilm = (filmId) => {
    if (filmId) {
      navigate(`/films/${filmId}`);
    }
  };

  useEffect(() => {
    const loadActor = async () => {
      try {
        const response = await api.get(`/api/actors/${actorId}`);
        const data = response.data.actor;

        // Process movies to ensure awards are properly structured
        if (data && data.movies) {
          // Deduplicate movies based on tconst
          const deduplicatedMovies = {};
          for (const movie of data.movies) {
            if (!deduplicatedMovies[movie.tconst]) {
              deduplicatedMovies[movie.tconst] = {
                ...movie,
                awards: []
              };
            }
            const existing = deduplicatedMovies[movie.tconst].awards.map(a => `${a.category}-${a.year}`);
            if (movie.awards) {
              for (const award of movie.awards) {
                const key = `${award.category}-${award.year}`;
                if (!existing.includes(key)) {
                  deduplicatedMovies[movie.tconst].awards.push(award);
                }
              }
            }
          }

          // Convert back to array and sort by year (newest first)
          data.movies = Object.values(deduplicatedMovies).sort((a, b) => 
            (b.year || 0) - (a.year || 0)
          );
        }
        
        setActor(data);
      } catch (err) {
        console.error('Failed to load actor:', err);
        setError('Failed to load actor details');
      } finally {
        setLoading(false);
      }
    };

    const loadFavorites = async () => {
      if (!currentUser) return;
      try {
        const response = await api.get('/api/users/favorites?type=actors');
        const favoritesList = response.data.actors || [];
        setFavorites(favoritesList);
        
        // Check if this actor is in favorites
        const isInFavorites = favoritesList.some(
          f => f.item_id === parseInt(actorId) || f.item_id === actorId
        );
        setInFavorites(isInFavorites);
      } catch (err) {
        console.error('Failed to load favorites:', err);
      }
    };

    loadActor();
    loadFavorites();
  }, [actorId, currentUser]);

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
          f.item_id === parseInt(actorId) || f.item_id === actorId
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
        await api.post('/api/users/favorites/actors', { 
          itemId: parseInt(actorId) || actorId
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !actor) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Actor not found.'}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>{actor.name}</Typography>
          <Button 
            variant={inFavorites ? "contained" : "outlined"}
            color="secondary"
            startIcon={inFavorites ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            onClick={handleToggleFavorite}
          >
            {inFavorites ? 'In Favorites' : 'Add to Favorites'}
          </Button>
        </Box>
        
        <Typography variant="subtitle1">Average Rating: {actor.averagerating?.toFixed(2) || 'N/A'}</Typography>
        <Typography variant="subtitle1">Total Awards: {actor.totalawards || 0}</Typography>
        <Typography variant="subtitle1">
          Total Box Office: {actor.totalboxoffice > 0 ? `$${Number(actor.totalboxoffice).toLocaleString()}` : 'Unknown'}
        </Typography>

        <Divider sx={{ my: 3 }} />
        <Typography variant="h6">Filmography ({actor.movies?.length || 0} films)</Typography>

        {actor.movies && actor.movies.length > 0 ? (
          actor.movies.map((movie, idx) => (
            <Box 
              key={idx} 
              sx={{ 
                my: 3, 
                p: 2, 
                border: '1px solid #e0e0e0', 
                borderRadius: 1, 
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.03)'
                }
              }}
              onClick={() => navigateToFilm(movie.tconst)}
            >
              <Typography variant="h6">
                {movie.title} ({movie.year || 'N/A'})
              </Typography>
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
            </Box>
          ))
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No films found for this actor.
          </Alert>
        )}
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

export default ActorDetailPage;