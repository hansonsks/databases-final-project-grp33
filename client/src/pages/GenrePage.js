import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, CircularProgress, Alert,
  Select, MenuItem, FormControl, InputLabel, TextField, Grid,
  Divider
} from '@mui/material';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import api from '../utils/api';
import LimitSelector from '../components/LimitSelector';

const GenrePage = () => {
  const [topGenres, setTopGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('revenue');
  const [startYear, setStartYear] = useState(1950);
  const [endYear, setEndYear] = useState(2020);
  const [limit, setLimit] = useState(10);
  const [dots, setDots] = useState(1);

  // Animate the dots for loading indicator
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setDots((p) => (p < 3 ? p + 1 : 1)), 500);
    return () => clearInterval(id);
  }, [loading]);

  const fetchTopGenres = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/genres/top', {
        params: { sortBy, startYear, endYear, limit }
      });
      setTopGenres(response.data.genres || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load top genres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopGenres();
  }, [sortBy, startYear, endYear, limit]);

  const handleYearChange = (setter) => (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1920 && value <= 2024) {
      setter(value);
    }
  };

  const handleLimitChange = (newLimit) => {
    console.log(`Limit changed to: ${newLimit}`);
    setLimit(newLimit);
  };

  // === Y-Axis Value Formatting ===
  const rawMax = Math.max(
    ...topGenres.map((genre) =>
      sortBy === 'revenue' ? genre.total_revenue : genre.total_awards
    ),
    0
  );

  const getRoundedMax = (value, interval) => {
    return Math.ceil(value / interval) * interval;
  };

  const paddedMax = sortBy === 'revenue'
    ? getRoundedMax(rawMax, 1e11)    // Round to nearest 100B
    : getRoundedMax(rawMax, 1000);   // Round to nearest 1,000

  const renderLoading = () => (
    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="200px">
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        Crunching data, please wait{'.'.repeat(dots)}
      </Typography>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <MovieFilterIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Genres
          </Typography>
        </Box>

        <Box mb={3}>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="revenue">Revenue</MenuItem>
                  <MenuItem value="awards">Awards</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Start Year (1920-2024)"
                type="number"
                inputProps={{ min: 1920, max: 2024 }}
                value={startYear}
                onChange={handleYearChange(setStartYear)}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="End Year (1920-2024)"
                type="number"
                inputProps={{ min: 1920, max: 2024 }}
                value={endYear}
                onChange={handleYearChange(setEndYear)}
              />
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          renderLoading()
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {/* Results count */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">
                Showing {topGenres.length} results
              </Typography>
            </Box>
          
            {/* Chart */}
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topGenres} margin={{ top: 20, right: 30, left: 50, bottom: 80 }}>
                <XAxis
                  dataKey="genre"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={100}
                />
                <YAxis
                  type="number"
                  tickCount={6}
                  tickFormatter={(value) =>
                    sortBy === 'revenue'
                      ? `$${(value / 1e6).toFixed(1)}M`
                      : value.toLocaleString()
                  }
                  domain={[0, paddedMax]}
                />
                <Tooltip
                  formatter={(value) =>
                    sortBy === 'revenue'
                      ? `$${Number(value).toLocaleString()}`
                      : Number(value).toLocaleString()
                  }
                />
                <Legend />
                <Bar
                  dataKey={sortBy === 'revenue' ? 'total_revenue' : 'total_awards'}
                  fill="#1976d2"
                  name={sortBy === 'revenue' ? 'Revenue' : 'Awards'}
                />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Results limit selector - at the bottom */}
            <Box mt={4} pt={2}>
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

export default GenrePage;