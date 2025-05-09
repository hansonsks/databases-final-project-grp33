import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
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
    console.log("Opening film dialog with data:", film);
    setSelectedFilm(film);
    setFilmDialogOpen(true);
    
    try {
      setLoadingFilmDetails(true);
      
      // Try to fetch complete film data using the most reliable identifier
      let detailedFilmData = null;
      
      // Case 1: We have a tconst/filmid - use the film detail endpoint directly
      if (film.tconst || film.filmid) {
        try {
          const filmId = film.tconst || film.filmid;
          const detailResponse = await api.get(`/api/films/${filmId}`);
          if (detailResponse.data && detailResponse.data.film) {
            detailedFilmData = detailResponse.data.film;
            console.log("Got detailed film data by ID:", detailedFilmData);
          }
        } catch (idError) {
          console.error("Error fetching film by ID:", idError);
        }
      }
      
      // Case 1.5: Special handling for box office films
      if (!detailedFilmData && film.isBoxOffice) {
        try {
          console.log("Processing box office film:", film);
          const filmId = film.tconst;
          
          if (filmId) {
            // Try to get complete details using the film ID
            try {
              const detailResponse = await api.get(`/api/films/${filmId}`);
              if (detailResponse.data && detailResponse.data.film) {
                detailedFilmData = detailResponse.data.film;
                console.log("Got box office film details by ID:", detailedFilmData);
              }
            } catch (idError) {
              console.error("Error fetching box office film by ID:", idError);
            }
          }
          
          // If we couldn't get detailed data, create a reasonable structure from what we have
          if (!detailedFilmData) {
            detailedFilmData = {
              tconst: film.tconst,
              title: film.title,
              year: film.year,
              directors: film.director ? film.director.split(', ').map(name => ({ name })) : [],
              averagerating: film.averagerating,
              revenue: film.revenue,
              // Add award info if it won an Oscar
              awards: film.won_oscar ? [{ 
                category: "Oscar", 
                year: film.year, 
                isWinner: true 
              }] : []
            };
          }
        } catch (boxOfficeError) {
          console.error("Error processing box office film:", boxOfficeError);
        }
      }
      
      // Case 2: Use the search endpoint if we have title (useful for Top Box Office Films)
      if (!detailedFilmData && film.title) {
        try {
          const searchParams = { title: film.title };
          if (film.year) searchParams.year = film.year;
          
          const searchResponse = await api.get('/api/films/search', { params: searchParams });
          if (searchResponse.data && searchResponse.data.film) {
            detailedFilmData = searchResponse.data.film;
            console.log("Got detailed film data by search:", detailedFilmData);
          }
        } catch (searchError) {
          console.error("Error searching for film:", searchError);
        }
      }
      
      // Case 3: For Oscar films, use the awards endpoints if previous methods failed
      if (!detailedFilmData && (film.awardid || film.category)) {
        try {
          let searchResponse;
          if (film.awardid) {
            searchResponse = await api.get('/api/awards/search-by-awardid', { 
              params: { awardid: film.awardid }
            });
          } else {
            searchResponse = await api.get('/api/awards/search-by-other', { 
              params: { 
                title: film.title || film.filmtitle,
                year: film.year,
                category: film.category,
                iswinner: film.iswinner
              }
            });
          }
          
          if (searchResponse.data && searchResponse.data.film && searchResponse.data.film[0]) {
            // Try to get more details using the film ID from awards
            const awardFilm = searchResponse.data.film[0];
            if (awardFilm.tconst) {
              try {
                const detailResponse = await api.get(`/api/films/${awardFilm.tconst}`);
                if (detailResponse.data && detailResponse.data.film) {
                  detailedFilmData = detailResponse.data.film;
                  console.log("Got detailed film data from award film ID:", detailedFilmData);
                }
              } catch (detailError) {
                console.error("Error fetching details for award film:", detailError);
                // Use award data directly if detail fetch fails
                detailedFilmData = {
                  tconst: awardFilm.tconst,
                  title: film.title || film.filmtitle,
                  year: film.year,
                  director: awardFilm.directors,
                  averagerating: awardFilm.imdb_rating,
                  awards: [
                    { category: film.category, year: film.year, isWinner: film.iswinner }
                  ]
                };
              }
            }
          }
        } catch (awardError) {
          console.error("Error fetching film from award data:", awardError);
        }
      }
      
      // Build the film details object from the best available data
      let filmData;
      
      if (detailedFilmData) {
        // Process cast from array if available
        let castDisplay = ['Cast information not available'];
        if (detailedFilmData.cast && Array.isArray(detailedFilmData.cast)) {
          castDisplay = detailedFilmData.cast.map(actor => actor.name).slice(0, 5);
        } else if (typeof detailedFilmData.cast === 'string') {
          castDisplay = [detailedFilmData.cast];
        }
        
        // Process directors from array if available
        let directorDisplay = 'Unknown Director';
        if (detailedFilmData.directors && Array.isArray(detailedFilmData.directors)) {
          directorDisplay = detailedFilmData.directors.map(d => d.name).join(', ');
        } else if (detailedFilmData.director) {
          directorDisplay = detailedFilmData.director;
        }
        
        // Ensure awards is a well-formed array
        let awardsArray = [];
        if (detailedFilmData.awards && Array.isArray(detailedFilmData.awards)) {
          awardsArray = detailedFilmData.awards;
        } else if (film.category) {
          awardsArray = [{ 
            category: film.category, 
            year: film.year, 
            isWinner: film.iswinner || film.won_oscar || false 
          }];
        }
        
        filmData = {
          tconst: detailedFilmData.tconst,
          title: detailedFilmData.title || film.title || film.filmtitle,
          year: detailedFilmData.year || film.year,
          director: directorDisplay,
          cast: castDisplay,
          awards: awardsArray,
          ratings: { imdb: detailedFilmData.averagerating || film.averagerating || 'N/A' },
          boxOffice: detailedFilmData.revenue ? `$${detailedFilmData.revenue.toLocaleString()}` : 'N/A'
        };
      } else {
        // Fallback to the original data we have
        filmData = {
          tconst: film.tconst || film.filmid,
          title: film.title || film.filmtitle,
          year: film.year,
          director: film.director || 'Unknown Director',
          cast: film.cast || ['Cast information not available'],
          awards: [{ 
            category: film.category || 'Unknown Category', 
            year: film.year, 
            isWinner: film.iswinner || film.won_oscar || false 
          }],
          ratings: { imdb: film.averagerating || 'N/A' },
          boxOffice: film.revenue ? `$${film.revenue.toLocaleString()}` : 'N/A'
        };
      }
      
      console.log("Final film details:", filmData);
      setFilmDetails(filmData);
      setLoadingFilmDetails(false);
      
    } catch (err) {
      console.error('Failed to load film details:', err);
      setFilmDetails({
        tconst: film.tconst || film.filmid,
        title: film.title || film.filmtitle,
        year: film.year,
        director: 'Information Not Available',
        cast: ['Information Not Available'],
        awards: [{ category: film.category || 'Unknown Category', year: film.year, isWinner: film.iswinner || film.won_oscar || false }],
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
      
      // If category already has films array from the API, use it
      if (category.films && category.films.length > 0) {
        console.log("Using films from category data:", category.films);
        setCategoryFilms(category.films);
        setLoadingCategoryFilms(false);
        return;
      }
      
      // Otherwise fetch films for this category from API
      const response = await api.get('/api/awards/by-category', {
        params: { category: category.category, limit: 20 }
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
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
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
            
            <Box sx={{ overflowY: 'auto', flexGrow: 1, maxHeight: 400 }}>
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
                    {(!data?.recentWinners || data.recentWinners.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No recent winners available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Top Categories */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
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
            
            <Box sx={{ overflowY: 'auto', flexGrow: 1, maxHeight: 400 }}>
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
                {(!data?.topCategories || data.topCategories.length === 0) && (
                  <ListItem>
                    <ListItemText primary="No categories available" />
                  </ListItem>
                )}
              </List>
            </Box>
          </Paper>
        </Grid>
        
        {/* Highest Grossing Films - New Column */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <AttachMoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Top Box Office Films</Typography>
              <Tooltip title="Click on any film to see more details">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ overflowY: 'auto', flexGrow: 1, maxHeight: 400 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Film</strong></TableCell>
                      <TableCell align="right"><strong>Revenue</strong></TableCell>
                      <TableCell align="right"><strong>Rating</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                  {data?.highestGrossing?.map((film, index) => (
                    <TableRow 
                      key={index} 
                      hover
                      onClick={() => handleOpenFilmDialog({
                        tconst: film.tconst,
                        title: film.title,
                        year: film.year,
                        director: film.director,
                        // Use exactly the same field names
                        averagerating: film.averagerating,
                        revenue: film.revenue,
                        won_oscar: film.won_oscar,
                        // Add a special flag to identify box office films
                        isBoxOffice: true
                      })}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {film.title} {film.won_oscar && (
                          <Tooltip title="Oscar Winner">
                            <EmojiEventsIcon 
                              fontSize="small" 
                              sx={{ color: 'gold', verticalAlign: 'middle', ml: 1, width: 16, height: 16 }} 
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="right">${(film.revenue / 1000000).toFixed(0)}M</TableCell>
                      <TableCell align="right">{film.averagerating?.toFixed(1) || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                    {(!data?.highestGrossing || data.highestGrossing.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No box office data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
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
            <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
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
                          handleOpenFilmDialog({
                            ...film,
                            title: film.title || film.filmtitle,
                            category: selectedCategory?.category
                          });
                        }}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{film.title || film.filmtitle}</TableCell>
                        <TableCell>{film.year}</TableCell>
                        <TableCell>
                          {film.isWinner || film.iswinner ? (
                            <Box display="flex" alignItems="center">
                              <EmojiEventsIcon sx={{ color: 'gold', mr: 1, fontSize: '1rem' }} />
                              Winner
                            </Box>
                          ) : (
                            'Nominee'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
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