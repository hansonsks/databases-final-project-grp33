import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  Select, MenuItem, FormControl, InputLabel, TextField, Grid
} from '@mui/material';
import TheatersIcon from '@mui/icons-material/Theaters';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const FilmPage = () => {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('roi');
  const [genre, setGenre] = useState('Drama');
  const [yearStart, setYearStart] = useState(2000);
  const [yearEnd, setYearEnd] = useState(2023);
  const [dotCount, setDotCount] = useState(1);
  const navigate = useNavigate();
  
  // Complete list of genres from the SQL DDL
  const genres = [
    'Action',
    'Adult',
    'Adventure',
    'Animation',
    'Biography',
    'Comedy',
    'Crime',
    'Documentary',
    'Drama',
    'Family',
    'Fantasy',
    'Film-Noir',
    'Game-Show',
    'History',
    'Horror',
    'Music',
    'Musical',
    'Mystery',
    'News',
    'Reality-TV',
    'Romance',
    'Sci-Fi',
    'Sport',
    'Talk-Show',
    'Thriller',
    'War',
    'Western'
  ];

  // Animate the dots for loading indicator
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setDotCount(prev => prev < 3 ? prev + 1 : 1);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Fetch data when parameters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        let response;
        
        if (sortBy === 'roi') {
          // Fetch films with highest ROI
          response = await api.get('/api/films/highest-roi', {
            params: { yearStart, yearEnd, limit: 15 }
          });
          
          // Format the data - films with ROI come in a different structure
          if (response.data.films) {
            setFilms(response.data.films);
          } else if (response.data.years) {
            // Map year-based data to a flat list of films
            const filmsArray = response.data.years.map(year => ({
              ...year.film,
              year: year.year
            }));
            setFilms(filmsArray);
          } else {
            setFilms([]);
          }
        } else if (sortBy === 'genre') {
          // Fetch top films by genre
          response = await api.get(`/api/films/top-by-genre/${encodeURIComponent(genre)}`, {
            params: { limit: 15 }
          });
          
          if (response.data && response.data.films) {
            setFilms(response.data.films);
          } else {
            setFilms([]);
          }
        } else if (sortBy === 'actor') {
          // Implementation for films by actor could be added here
          setFilms([]);
          setError('Films by actor sorting is not yet implemented');
        } else {
          // Default case
          setFilms([]);
          setError('This sorting option is not yet implemented');
        }
      } catch (err) {
        console.error('Failed to load films:', err);
        setError(`Failed to load films: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sortBy, genre, yearStart, yearEnd]);

  const handleSortByChange = (event) => {
    setSortBy(event.target.value);
  };

  const handleGenreChange = (event) => {
    setGenre(event.target.value);
  };

  const handleYearChange = (setter) => (event) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value)) {
      setter(value);
    }
  };

  const renderFilmsTable = () => {
    if (sortBy === 'roi') {
      return (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Title</strong></TableCell>
              <TableCell align="right"><strong>Year</strong></TableCell>
              <TableCell align="right"><strong>Rating</strong></TableCell>
              <TableCell align="right"><strong>Budget</strong></TableCell>
              <TableCell align="right"><strong>Revenue</strong></TableCell>
              <TableCell align="right"><strong>ROI (%)</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {films.map((film, index) => {
              const filmId = film.tconst || 'tt0000001';
              const title = film.title || film.film_title || film.primarytitle || "Unknown";
              const year = film.year || film.startyear || 'N/A';
              const rating = film.imdb_rating || film.averagerating || 'N/A';
              const revenue = film.revenue || 0;
              const budget = film.budget || 0;
              const roi = film.return_on_investment || film.roi || ((revenue / budget - 1) * 100).toFixed(1);
              
              return (
                <TableRow
                  key={index}
                  hover
                  onClick={() => navigate(`/films/${filmId}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{title}</TableCell>
                  <TableCell align="right">{year}</TableCell>
                  <TableCell align="right">{typeof rating === 'number' ? rating.toFixed(1) : rating}</TableCell>
                  <TableCell align="right">${budget.toLocaleString()}</TableCell>
                  <TableCell align="right">${revenue.toLocaleString()}</TableCell>
                  <TableCell align="right">{roi}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      );
    } else if (sortBy === 'genre') {
      return (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Title</strong></TableCell>
              <TableCell align="right"><strong>Year</strong></TableCell>
              <TableCell align="right"><strong>Rating</strong></TableCell>
              <TableCell align="right"><strong>Revenue</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {films.map((film, index) => {
              const filmId = film.tconst || 'tt0000001';
              const title = film.title || film.primarytitle || "Unknown";
              const year = film.year || film.startyear || 'N/A';
              const rating = film.averagerating || 'N/A';
              const revenue = film.revenue || 0;
              
              return (
                <TableRow
                  key={index}
                  hover
                  onClick={() => navigate(`/films/${filmId}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{title}</TableCell>
                  <TableCell align="right">{year}</TableCell>
                  <TableCell align="right">{typeof rating === 'number' ? rating.toFixed(1) : rating}</TableCell>
                  <TableCell align="right">${revenue.toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      );
    } else {
      return (
        <Typography variant="body1" align="center">
          No data available for this sorting option yet.
        </Typography>
      );
    }
  };

  const renderLoadingMessage = () => {
    const dots = '.'.repeat(dotCount);
    
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Crunching data, please wait{dots}
        </Typography>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <TheatersIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4">Films</Typography>
        </Box>

        <Box mb={3}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={handleSortByChange}
                >
                  <MenuItem value="roi">Return on Investment</MenuItem>
                  <MenuItem value="genre">By Genre</MenuItem>
                  <MenuItem value="actor">By Actor</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {sortBy === 'genre' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Genre</InputLabel>
                  <Select
                    value={genre}
                    label="Genre"
                    onChange={handleGenreChange}
                  >
                    {genres.map((g) => (
                      <MenuItem key={g} value={g}>{g}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            {sortBy === 'roi' && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Start Year"
                    type="number"
                    value={yearStart}
                    onChange={handleYearChange(setYearStart)}
                    InputProps={{ inputProps: { min: 1900, max: 2023 } }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="End Year"
                    type="number"
                    value={yearEnd}
                    onChange={handleYearChange(setYearEnd)}
                    InputProps={{ inputProps: { min: 1900, max: 2023 } }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        {loading ? (
          renderLoadingMessage()
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : films.length === 0 ? (
          <Alert severity="info">
            No films found. Try different search criteria or select another genre.
          </Alert>
        ) : (
          <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
            {renderFilmsTable()}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default FilmPage;