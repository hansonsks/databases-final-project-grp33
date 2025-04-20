import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container, Typography, CircularProgress, Paper,
  Divider, Box, Chip, Rating, Alert, Button,
  Snackbar, List, ListItem, ListItemText
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import TheatersIcon from '@mui/icons-material/Theaters';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const FilmDetailPage = () => {
  const { filmId } = useParams();
  const [film, setFilm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inFavorites, setInFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    const loadFilm = async () => {
      try {
        // In a real implementation, you would fetch from your API
        // Here I'm creating mock data for demonstration
        const mockFilm = {
          tconst: filmId,
          title: "The Shawshank Redemption",
          year: 1994,
          genres: ["Drama"],
          director: "Frank Darabont",
          averageRating: 9.3,
          revenue: 28341469,
          budget: 25000000,
          awards: [
            { category: "Best Actor", year: 1995, nominee: "Morgan Freeman", isWinner: false },
            { category: "Best Screenplay", year: 1995, nominee: "Frank Darabont", isWinner: false },
            { category: "Best Picture", year: 1995, isWinner: false }
          ],
          cast: [
            { nconst: "nm0000209", name: "Tim Robbins", role: "Andy Dufresne" },
            { nconst: "nm0000151", name: "Morgan Freeman", role: "Ellis Boyd 'Red' Redding" }
          ]
        };
        
        setFilm(mockFilm);
      } catch (err) {
        console.error('Failed to load film:', err);
        setError('Failed to load film details');
      } finally {
        setLoading(false);
      }
    };

    const loadFavorites = async () => {
      if (!currentUser) return;
      try {
        const response = await api.get('/api/users/favorites?type=films');
        setFavorites(response.data.films || []);
        
        // Check if this film is in favorites
        const isInFavorites = (response.data.films || []).some(
          f => f.item_id === parseInt(filmId)
        );
        setInFavorites(isInFavorites);
      } catch (err) {
        console.error('Failed to load favorites:', err);
      }
    };

    loadFilm();
    loadFavorites();
  }, [filmId, currentUser]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: 'Please log in to add favorites',
        severity: 'warning'
      });
      return;
    }

    try {
      if (inFavorites) {
        // Find the favorite_id
        const favorite = favorites.find(f => f.item_id === parseInt(filmId));
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
        await api.post('/api/users/favorites/films', { itemId: parseInt(filmId) });
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

  if (error || !film) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Film not found.'}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <TheatersIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Typography variant="h4">{film.title} ({film.year})</Typography>
          </Box>
          {currentUser && (
            <Button 
              variant={inFavorites ? "contained" : "outlined"}
              color="secondary"
              startIcon={inFavorites ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              onClick={handleToggleFavorite}
            >
              {inFavorites ? 'In Favorites' : 'Add to Favorites'}
            </Button>
          )}
        </Box>

        <Box sx={{ my: 3 }}>
          {film.genres.map(genre => (
            <Chip key={genre} label={genre} sx={{ mr: 1, mb: 1 }} />
          ))}
        </Box>

        <Box display="flex" sx={{ mb: 3 }}>
          <Box sx={{ mr: 4 }}>
            <Typography variant="subtitle2" color="text.secondary">Director</Typography>
            <Typography variant="body1">{film.director}</Typography>
          </Box>
          <Box sx={{ mr: 4 }}>
            <Typography variant="subtitle2" color="text.secondary">IMDb Rating</Typography>
            <Box display="flex" alignItems="center">
              <Rating value={film.averageRating / 2} precision={0.1} readOnly />
              <Typography variant="body1" sx={{ ml: 1 }}>{film.averageRating}/10</Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Box Office</Typography>
            <Typography variant="body1">${film.revenue.toLocaleString()}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Cast</Typography>
          </Box>
          <List>
            {film.cast.map((actor) => (
              <ListItem key={actor.nconst} sx={{ py: 1 }}>
                <ListItemText 
                  primary={actor.name} 
                  secondary={`as ${actor.role}`} 
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <EmojiEventsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Awards</Typography>
          </Box>
          <List>
            {film.awards.map((award, index) => (
              <ListItem key={index} sx={{ py: 1 }}>
                <ListItemText 
                  primary={award.category} 
                  secondary={`${award.year} - ${award.isWinner ? 'Winner' : 'Nominated'} ${award.nominee ? `- ${award.nominee}` : ''}`} 
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Box>
          <Box display="flex" alignItems="center" mb={2}>
            <AttachMoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Financial Information</Typography>
          </Box>
          <Box display="flex">
            <Box sx={{ mr: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">Budget</Typography>
              <Typography variant="body1">${film.budget.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ mr: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">Revenue</Typography>
              <Typography variant="body1">${film.revenue.toLocaleString()}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Return on Investment</Typography>
              <Typography variant="body1">
                {((film.revenue / film.budget - 1) * 100).toFixed(1)}%
              </Typography>
            </Box>
          </Box>
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

export default FilmDetailPage;