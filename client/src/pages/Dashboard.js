import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import api from '../utils/api';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Button,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MovieIcon from '@mui/icons-material/Movie';
import CategoryIcon from '@mui/icons-material/Category';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';

// Simple fallback data if the API fails
const fallbackData = {
  recentWinners: [
    { title: "Everything Everywhere All at Once", year: 2022, category: "Best Picture", iswinner: true },
    { title: "Everything Everywhere All at Once", year: 2022, category: "Best Director", iswinner: true },
    { title: "Everything Everywhere All at Once", year: 2022, category: "Best Actress", iswinner: true },
    { title: "All Quiet on the Western Front", year: 2022, category: "Best International Feature", iswinner: true },
    { title: "Nomadland", year: 2021, category: "Best Picture", iswinner: true },
    { title: "Nomadland", year: 2021, category: "Best Director", iswinner: true }
  ],
  topCategories: [
    { category: "Best Actor", award_count: 95 },
    { category: "Best Actress", award_count: 95 },
    { category: "Best Picture", award_count: 95 },
    { category: "Best Director", award_count: 92 },
    { category: "Best Supporting Actor", award_count: 85 }
  ],
  stats: {
    total_awards: 3140,
    total_films: 732,
    winning_films: 482,
    earliest_year: 1928,
    latest_year: 2022
  }
};

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);
  const [dotCount, setDotCount] = useState(1);
  
  // For the film detail dialog
  const [filmDialogOpen, setFilmDialogOpen] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [filmDetails, setFilmDetails] = useState(null);
  const [loadingFilmDetails, setLoadingFilmDetails] = useState(false);
  
  // For the category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryFilms, setCategoryFilms] = useState([]);
  const [loadingCategoryFilms, setLoadingCategoryFilms] = useState(false);

  // Animate loading dots
  useEffect(() => {
    let interval;
    if (loading || loadingFilmDetails || loadingCategoryFilms) {
      interval = setInterval(() => {
        setDotCount(prev => prev < 3 ? prev + 1 : 1);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [loading, loadingFilmDetails, loadingCategoryFilms]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/dashboard');
        console.log('Dashboard API Response:', response.data);
        setDashboardData(response.data);
        setUsingFallback(false);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setDashboardData(fallbackData);
        setUsingFallback(true);
        
        if (err.code === 'ECONNABORTED') {
          setError('Request timed out. Using demo data instead.');
        } else if (err.response?.status === 500) {
          setError('Server error while loading data. Using demo data instead.');
        } else {
          setError('Failed to load data. Using demo data instead.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleOpenFilmDialog = async (film) => {
    setSelectedFilm(film);
    setFilmDialogOpen(true);
    
    try {
      setLoadingFilmDetails(true);
      
      // Try to fetch real film data
      let filmData;

      try {
        let searchResponse;
        if (film.awardid) {
          searchResponse = await api.get('/api/awards/search-by-awardid', { 
            params: { 
              awardid : film.awardid
            }
          });
        } else {
          searchResponse = await api.get('/api/awards/search-by-other', { 
            params: { 
              title: film.title,
              year: film.year,
              category: film.category,
              iswinner: film.iswinner
            }
          });
        }
        const searchedFilm = searchResponse.data.film[0];
        filmData = {          
          title: film.title || film.filmtitle,
          year: film.year,
          director: searchedFilm.directors || 'Unknown Director',
          cast: searchedFilm.actors || ['Top Cast Information Not Available'],
          awards: [
            { category: searchedFilm.category, year: film.year, isWinner: film.iswinner }
          ],
          ratings: { imdb: searchedFilm.imdb_rating || 'N/A' },
          boxOffice: searchedFilm.box_office || 'N/A'
        };
      } catch (searchErr) {
        console.error('Error searching for film:', searchErr);
      }
      
      // If we couldn't get real data, use enhanced mock data
      if (!filmData) {
        filmData = {
          title: film.title,
          year: film.year,
          director: film.director || 'Unknown Director',
          cast: ['Top Cast Information Not Available'],
          awards: [
            { category: film.category, year: film.year, isWinner: film.iswinner }
          ],
          ratings: { imdb: 'N/A'},
          boxOffice: 'N/A'
        };
      }
      
      setFilmDetails(filmData);
      setLoadingFilmDetails(false);
      
    } catch (err) {
      console.error('Failed to load film details:', err);
      setFilmDetails({
        title: film.title,
        year: film.year,
        director: 'Information Not Available',
        cast: ['Information Not Available'],
        awards: [{ category: film.category, year: film.year, isWinner: film.iswinner }],
        ratings: { imdb: 'N/A'},
        boxOffice: 'N/A'
      });
      setLoadingFilmDetails(false);
    }
  };

  const handleCloseFilmDialog = () => {
    setFilmDialogOpen(false);
    setSelectedFilm(null);
    setFilmDetails(null);
  };

  const handleViewFullFilm = () => {
    // Try to find a film ID to navigate to
    if (filmDetails && filmDetails.tconst) {
      navigate(`/films/${filmDetails.tconst}`);
    } else {
      // If we don't have an ID, we can try to search for the film
      navigate(`/films?search=${encodeURIComponent(selectedFilm.title)}`);
    }
    handleCloseFilmDialog();
  };

  const handleOpenCategoryDialog = async (category) => {
    setSelectedCategory(category);
    setCategoryDialogOpen(true);
    
    try {
      setLoadingCategoryFilms(true);
      
      // Fetch real category films data from API
      const response = await api.get('/api/awards/by-category', {
        params: { category: category.category, limit: 10 }
      });
      
      if (response.data && response.data.films) {
        setCategoryFilms(response.data.films);
      } else {
        // Fallback to mock data if needed
        setCategoryFilms([
          { title: `Award winner for ${category.category}`, year: 2022, isWinner: true, filmid: 123 },
          { title: `Award winner for ${category.category}`, year: 2021, isWinner: true, filmid: 124 },
          { title: `Award winner for ${category.category}`, year: 2020, isWinner: true, filmid: 125 },
          { title: `Award nominee for ${category.category}`, year: 2019, isWinner: false, filmid: 126 },
          { title: `Award nominee for ${category.category}`, year: 2018, isWinner: false, filmid: 127 }
        ]);
      }
      
      setLoadingCategoryFilms(false);
    } catch (err) {
      console.error('Failed to load category films:', err);
      
      // Fallback to mock data
      setCategoryFilms([
        { title: `Award winner for ${category.category}`, year: 2022, isWinner: true, filmid: 123 },
        { title: `Award winner for ${category.category}`, year: 2021, isWinner: true, filmid: 124 },
        { title: `Award winner for ${category.category}`, year: 2020, isWinner: true, filmid: 125 },
        { title: `Award nominee for ${category.category}`, year: 2019, isWinner: false, filmid: 126 },
        { title: `Award nominee for ${category.category}`, year: 2018, isWinner: false, filmid: 127 }
      ]);
      setLoadingCategoryFilms(false);
    }
  };

  const handleCloseCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setSelectedCategory(null);
    setCategoryFilms([]);
  };

  const renderLoadingDots = () => {
    const dots = '.'.repeat(dotCount);
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary" sx={{ ml: 2 }}>
          Loading{dots}
        </Typography>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Get data either from API or fallback
  const data = dashboardData || fallbackData;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {usingFallback && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {error || 'Using demo data - backend API not available'}
        </Alert>
      )}
      
      {/* Welcome Message */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mb: 4, 
          backgroundImage: 'linear-gradient(to right,  #1976d2, #2196f3)',
          color: 'white'
        }}
      >
        <Typography variant="h4" gutterBottom>
          {currentUser ? `Welcome, ${currentUser.name}!` : 'Oscar Awards Dashboard'}
        </Typography>
        <Typography variant="body1">
          Explore data and insights from the Academy Awards, including recent winners, popular categories, and historical trends.
        </Typography>
        {!currentUser && (
          <Button 
            variant="contained" 
            color="secondary" 
            component={RouterLink} 
            to="/register" 
            sx={{ mt: 2 }}
          >
            Create an Account
          </Button>
        )}
      </Paper>

      <Grid container spacing={4}>
        {/* Recent Oscar Winners */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <EmojiEventsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Recent Oscar Winners</Typography>
              <Tooltip title="Click on any film to see more details">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Film</strong></TableCell>
                    <TableCell><strong>Category</strong></TableCell>
                    <TableCell><strong>Year</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.recentWinners?.map((winner, index) => (
                    <TableRow 
                      key={index} 
                      hover
                      onClick={() => {
                        handleOpenFilmDialog(winner);
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{winner.title || winner.filmtitle}</TableCell>
                      <TableCell>{winner.category}</TableCell>
                      <TableCell>{winner.year}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Top Categories */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Top Oscar Categories</Typography>
              <Tooltip title="Click on any category to see films that won in this category">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              {data?.topCategories?.map((category, index) => (
                <ListItem 
                  key={index} 
                  divider={index < data.topCategories.length - 1}
                  button
                  onClick={() => handleOpenCategoryDialog(category)}
                >
                  <ListItemText 
                    primary={category.category} 
                    secondary={`${category.award_count} awards`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Oscar Statistics */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <ShowChartIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Oscar Award Statistics</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {data?.stats?.total_awards?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Awards
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {data?.stats?.total_films?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Films Nominated
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {data?.stats?.winning_films?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Winning Films
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {data?.stats?.latest_year || 2022}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Latest Year
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {data?.stats?.earliest_year || 1928}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      First Year
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {data?.stats?.latest_year - data?.stats?.earliest_year + 1 || 95}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Years of History
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Film Detail Dialog */}
      <Dialog
        open={filmDialogOpen}
        onClose={handleCloseFilmDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedFilm?.title || selectedFilm?.filmtitle} ({selectedFilm?.year})
        </DialogTitle>
        <DialogContent>
          {loadingFilmDetails ? (
            renderLoadingDots()
          ) : filmDetails ? (
            <Grid container spacing = {2} rowSpacing={2} columnSpacing = {10}>
              <Grid item xs={12}>
                <Typography variant="h6">Oscar Awards</Typography>
                <Typography variant="body1">
                  {filmDetails.awards[0].category} ({selectedFilm?.year}) - {selectedFilm?.iswinner ? 'Winner' : 'Nominee'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="h6">Director(s)</Typography>
                <Typography variant="body1">{filmDetails.director}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="h6">Box Office</Typography>
                <Typography variant="body1">{filmDetails.boxOffice}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6">Cast</Typography>
                <Typography variant="body1">
                  {Array.isArray(filmDetails.cast) ? filmDetails.cast.join(', ') : filmDetails.cast || 'Cast information not available'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="h6">Ratings</Typography>
                <Typography variant="body1">
                  IMDb: {filmDetails.ratings?.imdb || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography>No details available for this film.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFilmDialog}>Close</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleViewFullFilm}
            startIcon={<SearchIcon />}
          >
            View Full Details
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Films Dialog */}
      <Dialog
        open={categoryDialogOpen}
        onClose={handleCloseCategoryDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedCategory?.category} Films
        </DialogTitle>
        <DialogContent>
          {loadingCategoryFilms ? (
            renderLoadingDots()
          ) : categoryFilms.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Film</strong></TableCell>
                    <TableCell><strong>Year</strong></TableCell>
                    <TableCell><strong>Result</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categoryFilms.map((film, index) => (
                    <TableRow 
                      key={index} 
                      hover
                      onClick={() => {
                        handleCloseCategoryDialog();
                        handleOpenFilmDialog(film);
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{film.title || film.filmtitle}</TableCell>
                      <TableCell>{film.year}</TableCell>
                      <TableCell>{film.isWinner || film.iswinner ? 'Winner' : 'Nominee'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>No films found for this category.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;