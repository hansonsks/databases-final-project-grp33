import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Button,
  Alert
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

// Fallback data to use if the API fails
const fallbackData = {
  trending: {
    actors: [
      { nconst: 1, name: "Tom Hanks", recentFilm: "Finch" },
      { nconst: 2, name: "Florence Pugh", recentFilm: "Oppenheimer" },
      { nconst: 3, name: "Cillian Murphy", recentFilm: "Oppenheimer" }
    ],
    films: [
      { tconst: 1, title: "Oppenheimer", year: 2023, averageRating: 8.5 },
      { tconst: 2, title: "Barbie", year: 2023, averageRating: 7.0 },
      { tconst: 3, title: "The Killer", year: 2023, averageRating: 6.8 }
    ]
  },
  stats: {
    topGenre: "Drama",
    highestGrossingFilm: { title: "Avatar", revenue: 2847246203 },
    mostAwardedActor: { name: "Meryl Streep", awards: 21 }
  }
};

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Set up timeout for the API call
      const TIMEOUT_DURATION = 5000; // 5 seconds
      let timeoutId;

      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Request timed out'));
          }, TIMEOUT_DURATION);
        });

        const config = {
          baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
        };

        // Race between the API call and the timeout
        const result = await Promise.race([
          axios.get('/api/dashboard', config),
          timeoutPromise
        ]);

        // Clear the timeout if the API call succeeds
        clearTimeout(timeoutId);
        
        setDashboardData(result.data);
        setUsingFallback(false);
        setTimeoutMessage('');
      } catch (err) {
        // Clear the timeout to prevent memory leaks
        if (timeoutId) clearTimeout(timeoutId);
        
        console.error('Failed to load dashboard data:', err);
        
        if (err.message === 'Request timed out') {
          setTimeoutMessage('Backend data is taking too long to load, showing fallback data instead.');
        } else if (err.response?.status === 500) {
          setError('Server error while loading dashboard data');
        }
        
        setDashboardData(fallbackData);
        setUsingFallback(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
          {timeoutMessage || 'Using demo data - backend API not available'}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Welcome Message */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mb: 4, 
          backgroundImage: 'linear-gradient(to right, #1976d2, #2196f3)',
          color: 'white'
        }}
      >
        <Typography variant="h4" gutterBottom>
          {currentUser ? `Welcome, ${currentUser.name}!` : 'Welcome to Movie Database Analytics'}
        </Typography>
        <Typography variant="body1">
          Explore detailed analytics about movies, actors, directors, and genres from our comprehensive database.
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
        {/* Trending Movies */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Trending Movies</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              {data?.trending?.films?.map((film) => (
                <Grid item xs={12} sm={6} key={film.tconst}>
                  <Card>
                    <CardActionArea component={RouterLink} to={`/films/${film.tconst}`}>
                      <CardMedia
                        component="img"
                        height="140"
                        image={`https://via.placeholder.com/400x200?text=${encodeURIComponent(film.title)}`}
                        alt={film.title}
                      />
                      <CardContent>
                        <Typography variant="h6" noWrap>{film.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {film.year}
                        </Typography>
                        <Box display="flex" alignItems="center" mt={1}>
                          <StarIcon sx={{ color: 'gold', mr: 0.5 }} />
                          <Typography variant="body2">
                            {typeof film.averageRating === 'number' ? 
                              film.averageRating.toFixed(1) : 
                              film.averagerating?.toFixed(1) || "N/A"}
                          </Typography>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box textAlign="center" mt={2}>
              <Button 
                variant="outlined" 
                component={RouterLink} 
                to="/films"
              >
                View All Films
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Trending Actors */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Trending Actors</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              {data?.trending?.actors?.map((actor) => (
                <ListItem 
                  key={actor.nconst}
                  component={RouterLink}
                  to={`/actors/${actor.nconst}`}
                  sx={{ 
                    textDecoration: 'none', 
                    color: 'inherit',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={actor.name} 
                    secondary={`Recent film: ${actor.recentFilm}`}
                  />
                </ListItem>
              ))}
            </List>

            <Box textAlign="center" mt={2}>
              <Button 
                variant="outlined" 
                component={RouterLink} 
                to="/actors"
              >
                View All Actors
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Statistics */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Quick Stats</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center" p={2}>
                  <Chip 
                    icon={<MovieIcon />} 
                    label={data?.stats?.topGenre} 
                    color="primary"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Top Genre
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Box textAlign="center" p={2}>
                  <Typography variant="h6" noWrap>{data?.stats?.highestGrossingFilm?.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${(data?.stats?.highestGrossingFilm?.revenue / 1000000).toFixed(1)}M Revenue
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Highest Grossing Film
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Box textAlign="center" p={2}>
                  <Typography variant="h6" noWrap>{data?.stats?.mostAwardedActor?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data?.stats?.mostAwardedActor?.awards} Awards
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Most Awarded Actor
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;


// Emily's code for DirectorPage.js
// import { useEffect, useState } from 'react';
// import { Button, Checkbox, Container, FormControlLabel, Grid, Link, Slider, TextField } from '@mui/material';
// import { DataGrid } from '@mui/x-data-grid';

// const config = require('../config.json');

// export default function DirectorPage() {
//     const [data, setData] = useState([]);
//     // default value for sortBy shouldn't do anything since sortBy is required
//     const [sortBy, setSortBy] = useState('');
//     const [limitTop, setLimitTop] = useState(10);
//     const [decade, setDecade] = useState(2020);
//     const [limitDecade, setLimitDecade] = useState(10);

//     // `http://${config.server_host}:${config.server_port}/directors/top`
//       // sortBy and limit
//     // `http://${config.server_host}:${config.server_port}/directors/:directorId`
//       // directorId
//     // `http://${config.server_host}:${config.server_port}/directors/by-decade`
//       // decade and limit

//     const searchTopDirectors = () => {
//         fetch(`http://${config.server_host}:${config.server_port}/directors/top?sortBy=${sortBy}&limit=${limitTop}`)
//             .then(res => res.json())
//             .then(resJson => {
//                 const directorsWithId = resJson.map((director) => ({ id: director.nconst, ...director }));
//                 setData(directorsWithId);
//         });
//     }

//     const searchByDecade = () => {
//         fetch(`http://${config.server_host}:${config.server_port}/directors/by-decade?decade=${decade}&limit=${limitDecade}`)
//             .then(res => res.json())
//             .then(resJson => {
//                 const directorsWithId = resJson.map((director) => ({ id: director.nconst, ...director }));
//                 setData(directorsWithId);
//         });
//     }

//     return (
//       <Container>
//         {/*selectedSongId && <SongCard songId={selectedSongId} handleClose={() => setSelectedSongId(null)} />*/}
//         <h2>Search Directors</h2>
//         <Grid container spacing={6}>
//           <Grid item xs={6}>
//             <TextField label='Sort By' value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: "100%" }}/>
//           </Grid>
//           <Grid item xs={3}>
//             <p>Limit</p>
//             <Slider
//               value={limit}
//               min={1}
//               max={20}
//               step={1}
//               onChange={(e, newValue) => setLimitTop(newValue)}
//               valueLabelDisplay='auto'
//               valueLabelFormat={value => <div>{value}</div>}
//             />
//           </Grid>
//           <Grid item xs={6}>
//             <p>Decade</p>
//             <Slider
//               value={danceability}
//               min={1930}
//               max={2020}
//               step={10}
//               onChange={(e, newValue) => setDecade(newValue)}
//               valueLabelDisplay='auto'
//               valueLabelFormat={value => <div>{value}</div>}
//             />
//           </Grid>
//           <Grid item xs={3}>
//             <p>Limit</p>
//             <Slider
//               value={limit}
//               min={1}
//               max={20}
//               step={1}
//               onChange={(e, newValue) => setLimitDecade(newValue)}
//               valueLabelDisplay='auto'
//               valueLabelFormat={value => <div>{value}</div>}
//             />
//           </Grid>
//         </Grid>
//         <Button onClick={() => searchTopDirectors() } style={{ left: '50%', transform: 'translateX(-50%)' }}>
//           Search by Top
//         </Button>
//         <Button onClick={() => searchByDecade() } style={{ left: '50%', transform: 'translateX(-50%)' }}>
//           Search by Decade
//         </Button>
//         {/*     
//         <Button onClick={() => search() } style={{ left: '50%', transform: 'translateX(-50%)' }}>
//           Search
//         </Button>
//         <h2>Results</h2>
//         <DataGrid
//           rows={data}
//           columns={columns}
//           pageSize={pageSize}
//           rowsPerPageOptions={[5, 10, 25]}
//           onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
//           autoHeight
//         />
//         */}
//       </Container>
//     );
// };