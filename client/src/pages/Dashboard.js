import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
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
  TableRow
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MovieIcon from '@mui/icons-material/Movie';
import CategoryIcon from '@mui/icons-material/Category';
import ShowChartIcon from '@mui/icons-material/ShowChart';

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
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      
      try {
        const response = await axios.get(`${API_URL}/api/dashboard`, { timeout: 500000 });
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
          backgroundImage: 'linear-gradient(to right, #1976d2, #2196f3)',
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
                    <TableRow key={index} hover>
                      <TableCell>{winner.title}</TableCell>
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
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              {data?.topCategories?.map((category, index) => (
                <ListItem key={index} divider={index < data.topCategories.length - 1}>
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
    </Container>
  );
};

export default Dashboard;