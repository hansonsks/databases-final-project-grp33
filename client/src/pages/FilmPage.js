import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  Select, MenuItem, FormControl, InputLabel, TextField, Grid,
  Button, Divider, TableSortLabel
} from '@mui/material';
import TheatersIcon from '@mui/icons-material/Theaters';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import LimitSelector from '../components/LimitSelector';

const FilmPage = () => {
  const [films, setFilms] = useState([]);
  const [filteredFilms, setFilteredFilms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('roi');
  const [genre, setGenre] = useState('Drama');
  const [actorName, setActorName] = useState('Tom Hanks');
  const [actorSortBy, setActorSortBy] = useState('year');
  const [actorSortOrder, setActorSortOrder] = useState('desc');
  const [yearStart, setYearStart] = useState(2000);
  const [yearEnd, setYearEnd] = useState(2023);
  const [limit, setLimit] = useState(10); // Default limit
  const [dotCount, setDotCount] = useState(1);
  
  // Column sorting states
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('desc');
  
  const navigate = useNavigate();
  
  // Complete list of genres from the SQL DDL
  const genres = [
    'Action', 'Adult', 'Adventure', 'Animation', 'Biography',
    'Comedy', 'Crime', 'Documentary', 'Drama', 'Family',
    'Fantasy', 'Film-Noir', 'Game-Show', 'History', 'Horror',
    'Music', 'Musical', 'Mystery', 'News', 'Reality-TV',
    'Romance', 'Sci-Fi', 'Sport', 'Talk-Show', 'Thriller',
    'War', 'Western'
  ];

  // Actor sort options - simplified to only include options that don't require joins
  const actorSortOptions = [
    { value: 'year', label: 'Release Year' },
    { value: 'title', label: 'Title' }
  ];

  // Sort order options
  const sortOrderOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' }
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
            params: { 
              yearStart, 
              yearEnd, 
              limit
            }
          });
          
          console.log("ROI response data:", response.data);
          
          // Format the data - films with ROI come in a different structure
          if (response.data.films) {
            // Ensure numeric values are properly parsed
            const processedFilms = response.data.films.map(film => ({
              ...film,
              budget: typeof film.budget === 'string' ? parseFloat(film.budget.replace(/[^\d.-]/g, '')) : (film.budget || 0),
              revenue: typeof film.revenue === 'string' ? parseFloat(film.revenue.replace(/[^\d.-]/g, '')) : (film.revenue || 0),
              return_on_investment: typeof film.return_on_investment === 'string' 
                ? parseFloat(film.return_on_investment.replace(/[^\d.-]/g, '')) 
                : (film.return_on_investment || 0),
              imdb_rating: typeof film.imdb_rating === 'string' 
                ? parseFloat(film.imdb_rating) 
                : (film.imdb_rating || 0)
            }));
            
            setFilms(processedFilms);
            setFilteredFilms(processedFilms);
            // Set default column sort for ROI view
            if (!orderBy) {
              setOrderBy('return_on_investment');
              setOrder('desc');
            }
          } else if (response.data.years) {
            // Map year-based data to a flat list of films
            const filmsArray = response.data.years.map(year => ({
              ...year.film,
              year: year.year,
              budget: typeof year.film.budget === 'string' 
                ? parseFloat(year.film.budget.replace(/[^\d.-]/g, '')) 
                : (year.film.budget || 0),
              revenue: typeof year.film.revenue === 'string' 
                ? parseFloat(year.film.revenue.replace(/[^\d.-]/g, '')) 
                : (year.film.revenue || 0),
              return_on_investment: typeof year.film.return_on_investment === 'string' 
                ? parseFloat(year.film.return_on_investment.replace(/[^\d.-]/g, '')) 
                : (year.film.return_on_investment || 0),
              imdb_rating: typeof year.film.imdb_rating === 'string' 
                ? parseFloat(year.film.imdb_rating) 
                : (year.film.imdb_rating || 0)
            }));
            
            setFilms(filmsArray);
            setFilteredFilms(filmsArray);
            // Set default column sort for ROI view
            if (!orderBy) {
              setOrderBy('return_on_investment');
              setOrder('desc');
            }
          } else {
            setFilms([]);
            setFilteredFilms([]);
          }
        } else if (sortBy === 'genre') {
          // Fetch top films by genre
          response = await api.get(`/api/films/top-by-genre/${encodeURIComponent(genre)}`, {
            params: { limit }
          });
          
          console.log("Genre response data:", response.data);
          
          if (response.data && response.data.films) {
            // Ensure numeric values are properly parsed
            const processedFilms = response.data.films.map(film => ({
              ...film,
              year: typeof film.year === 'string' ? parseInt(film.year, 10) : (film.year || 0),
              averagerating: typeof film.averagerating === 'string' 
                ? parseFloat(film.averagerating) 
                : (film.averagerating || 0),
              revenue: typeof film.revenue === 'string' 
                ? parseFloat(film.revenue.replace(/[^\d.-]/g, '')) 
                : (film.revenue || 0)
            }));
            
            setFilms(processedFilms);
            setFilteredFilms(processedFilms);
            // Set default column sort for genre view
            if (!orderBy) {
              setOrderBy('revenue');
              setOrder('desc');
            }
          } else {
            setFilms([]);
            setFilteredFilms([]);
          }
        } else if (sortBy === 'actor') {
          // Fetch films by actor
          if (!actorName.trim()) {
            setError('Please enter an actor name');
            setFilms([]);
            setFilteredFilms([]);
            setLoading(false);
            return;
          }

          response = await api.get(`/api/films/by-actor/${encodeURIComponent(actorName)}`, {
            params: { 
              sortBy: actorSortBy, 
              order: actorSortOrder
            }
          });
          
          console.log("Actor films response data:", response.data);
          
          if (response.data && response.data.films) {
            // Ensure numeric values are properly parsed
            const processedFilms = response.data.films.map(film => ({
              ...film,
              year: typeof film.year === 'string' ? parseInt(film.year, 10) : (film.year || 0)
            }));
            
            setFilms(processedFilms);
            setFilteredFilms(processedFilms);
            // Set default column sort for actor view
            if (!orderBy) {
              setOrderBy('year');
              setOrder('desc');
            }
          } else {
            setFilms([]);
            setFilteredFilms([]);
          }
        } else {
          // Default case
          setFilms([]);
          setFilteredFilms([]);
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
  }, [sortBy, genre, yearStart, yearEnd, actorName, actorSortBy, actorSortOrder, limit]);
  
  // Apply column sorting to the filtered films
  useEffect(() => {
    if (!orderBy || !films.length) {
      setFilteredFilms(films);
      return;
    }
    
    // Helper function to safely extract numeric values
    const getNumericValue = (obj, key) => {
      if (obj[key] === null || obj[key] === undefined) return 0;
      
      // Try to convert string to number
      if (typeof obj[key] === 'string') {
        // Remove any non-numeric characters except decimal point
        const cleanedStr = obj[key].replace(/[^\d.-]/g, '');
        return parseFloat(cleanedStr) || 0;
      }
      
      return obj[key] || 0;
    };
    
    // Get the correct property name
    const getSortValue = (film) => {
      // Handle fields with different names in different views
      if (orderBy === 'film_title' && film.film_title) return film.film_title;
      if (orderBy === 'film_title' && film.title) return film.title;
      if (orderBy === 'film_title' && film.primarytitle) return film.primarytitle;
      
      if (orderBy === 'title' && film.title) return film.title;
      if (orderBy === 'title' && film.film_title) return film.film_title;
      if (orderBy === 'title' && film.primarytitle) return film.primarytitle;
      
      if (orderBy === 'imdb_rating' && film.imdb_rating !== undefined) return film.imdb_rating;
      if (orderBy === 'imdb_rating' && film.averagerating !== undefined) return film.averagerating;
      
      if (orderBy === 'averagerating' && film.averagerating !== undefined) return film.averagerating;
      if (orderBy === 'averagerating' && film.imdb_rating !== undefined) return film.imdb_rating;
      
      if (orderBy === 'return_on_investment' && film.return_on_investment !== undefined) return film.return_on_investment;
      if (orderBy === 'return_on_investment' && film.roi !== undefined) return film.roi;
      
      if (orderBy === 'roi' && film.roi !== undefined) return film.roi;
      if (orderBy === 'roi' && film.return_on_investment !== undefined) return film.return_on_investment;
      
      // If none of the special cases match, get the value directly
      return film[orderBy];
    };
    
    const sortedFilms = [...films].sort((a, b) => {
      // Get the values to compare
      let valueA = getSortValue(a);
      let valueB = getSortValue(b);
      
      // Handle null/undefined
      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;
      
      // For titles (string comparison)
      if (orderBy === 'title' || orderBy === 'film_title') {
        return order === 'asc' 
          ? String(valueA).localeCompare(String(valueB))
          : String(valueB).localeCompare(String(valueA));
      }
      
      // For numeric values, ensure proper conversion
      const numericA = getNumericValue(a, orderBy);
      const numericB = getNumericValue(b, orderBy);
      
      return order === 'asc' ? numericA - numericB : numericB - numericA;
    });
    
    setFilteredFilms(sortedFilms);
  }, [films, orderBy, order]);

  const handleSortByChange = (event) => {
    setSortBy(event.target.value);
    // Reset column sorting when changing view
    setOrderBy('');
    setOrder('desc');
  };

  const handleGenreChange = (event) => {
    setGenre(event.target.value);
  };

  const handleActorNameChange = (event) => {
    setActorName(event.target.value);
  };

  const handleActorSortByChange = (event) => {
    setActorSortBy(event.target.value);
  };

  const handleActorSortOrderChange = (event) => {
    setActorSortOrder(event.target.value);
  };

  const handleYearChange = (setter) => (event) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value)) {
      setter(value);
    }
  };
  
  const handleLimitChange = (newLimit) => {
    console.log(`Limit changed to: ${newLimit}`);
    setLimit(newLimit);
  };
  
  // Handle column sort click
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Create sort handler for a column
  const createSortHandler = (property) => () => {
    handleRequestSort(property);
  };
  
  // Navigate to film details safely
  const navigateToFilm = (film) => {
    console.log("Navigating to film:", film);
    
    // Try to get the film ID
    const filmId = film.tconst || film.filmid;
    
    if (!filmId || filmId === 'tt0000001') {
      console.warn("Missing or default film ID:", filmId, "Film data:", film);
    }
    
    // Only navigate if we have a valid ID
    if (filmId && filmId !== 'tt0000001') {
      navigate(`/films/${filmId}`);
    } else {
      // If no valid ID, try to search by title
      const title = film.title || film.film_title || film.primarytitle;
      if (title) {
        navigate(`/films?search=${encodeURIComponent(title)}`);
      } else {
        console.error("Cannot navigate - no valid ID or title:", film);
      }
    }
  };

  const renderFilmsTable = () => {
    if (sortBy === 'roi') {
      return (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'film_title' || orderBy === 'title'}
                  direction={orderBy === 'film_title' || orderBy === 'title' ? order : 'asc'}
                  onClick={createSortHandler(filteredFilms[0]?.film_title !== undefined ? 'film_title' : 'title')}
                >
                  <strong>Title</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'year'}
                  direction={orderBy === 'year' ? order : 'asc'}
                  onClick={createSortHandler('year')}
                >
                  <strong>Year</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'imdb_rating' || orderBy === 'averagerating'}
                  direction={orderBy === 'imdb_rating' || orderBy === 'averagerating' ? order : 'asc'}
                  onClick={createSortHandler(filteredFilms[0]?.imdb_rating !== undefined ? 'imdb_rating' : 'averagerating')}
                >
                  <strong>Rating</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'budget'}
                  direction={orderBy === 'budget' ? order : 'asc'}
                  onClick={createSortHandler('budget')}
                >
                  <strong>Budget</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'revenue'}
                  direction={orderBy === 'revenue' ? order : 'asc'}
                  onClick={createSortHandler('revenue')}
                >
                  <strong>Revenue</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'return_on_investment' || orderBy === 'roi'}
                  direction={orderBy === 'return_on_investment' || orderBy === 'roi' ? order : 'asc'}
                  onClick={createSortHandler(filteredFilms[0]?.return_on_investment !== undefined ? 'return_on_investment' : 'roi')}
                >
                  <strong>ROI (%)</strong>
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFilms.map((film, index) => {
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
                  onClick={() => navigateToFilm(film)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{title}</TableCell>
                  <TableCell align="right">{year}</TableCell>
                  <TableCell align="right">{typeof rating === 'number' ? rating.toFixed(1) : rating}</TableCell>
                  <TableCell align="right">${typeof budget === 'number' ? budget.toLocaleString() : budget}</TableCell>
                  <TableCell align="right">${typeof revenue === 'number' ? revenue.toLocaleString() : revenue}</TableCell>
                  <TableCell align="right">{typeof roi === 'number' ? roi.toFixed(1) : roi}%</TableCell>
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
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'title'}
                  direction={orderBy === 'title' ? order : 'asc'}
                  onClick={createSortHandler('title')}
                >
                  <strong>Title</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'year'}
                  direction={orderBy === 'year' ? order : 'asc'}
                  onClick={createSortHandler('year')}
                >
                  <strong>Year</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'averagerating'}
                  direction={orderBy === 'averagerating' ? order : 'asc'}
                  onClick={createSortHandler('averagerating')}
                >
                  <strong>Rating</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'revenue'}
                  direction={orderBy === 'revenue' ? order : 'asc'}
                  onClick={createSortHandler('revenue')}
                >
                  <strong>Revenue</strong>
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFilms.map((film, index) => {
              const title = film.title || film.primarytitle || "Unknown";
              const year = film.year || film.startyear || 'N/A';
              const rating = film.averagerating || 'N/A';
              const revenue = film.revenue || 0;
              
              return (
                <TableRow
                  key={index}
                  hover
                  onClick={() => navigateToFilm(film)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{title}</TableCell>
                  <TableCell align="right">{year}</TableCell>
                  <TableCell align="right">{typeof rating === 'number' ? rating.toFixed(1) : rating}</TableCell>
                  <TableCell align="right">${typeof revenue === 'number' ? revenue.toLocaleString() : revenue}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      );
    } else if (sortBy === 'actor') {
      return (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'title'}
                  direction={orderBy === 'title' ? order : 'asc'}
                  onClick={createSortHandler('title')}
                >
                  <strong>Title</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'year'}
                  direction={orderBy === 'year' ? order : 'asc'}
                  onClick={createSortHandler('year')}
                >
                  <strong>Year</strong>
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFilms.map((film, index) => {
              const title = film.title || film.primarytitle || "Unknown";
              const year = film.year || film.startyear || 'N/A';
              
              return (
                <TableRow
                  key={index}
                  hover
                  onClick={() => navigateToFilm(film)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{title}</TableCell>
                  <TableCell align="right">{year}</TableCell>
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
            
            {sortBy === 'actor' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Actor Name"
                    value={actorName}
                    onChange={handleActorNameChange}
                    placeholder="Enter actor name"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Sort Films By</InputLabel>
                    <Select
                      value={actorSortBy}
                      label="Sort Films By"
                      onChange={handleActorSortByChange}
                    >
                      {actorSortOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Sort Order</InputLabel>
                    <Select
                      value={actorSortOrder}
                      label="Sort Order"
                      onChange={handleActorSortOrderChange}
                    >
                      {sortOrderOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
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
        ) : filteredFilms.length === 0 ? (
          <Alert severity="info">
            No films found. Try different search criteria or select another {sortBy === 'actor' ? 'actor' : sortBy === 'genre' ? 'genre' : 'time period'}.
          </Alert>
        ) : (
          <>
            {/* Results count */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">
                Showing {filteredFilms.length} results
              </Typography>
              
              {orderBy && (
                <Typography variant="body2" color="text.secondary">
                  Sorted by: {orderBy.replace('_', ' ')} ({order === 'asc' ? 'ascending' : 'descending'})
                </Typography>
              )}
            </Box>
          
            {/* Table with results */}
            <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {renderFilmsTable()}
            </Box>
            
            {/* Results limit selector - at the bottom */}
            <Box mt={3} pt={2}>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" justifyContent="center" alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                  Results per page:
                </Typography>
                <LimitSelector
                  value={limit}
                  onChange={handleLimitChange}
                  options={[5, 10, 25, 50, 100]}
                />
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default FilmPage;