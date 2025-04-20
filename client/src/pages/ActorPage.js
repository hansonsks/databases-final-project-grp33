import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ActorPage = () => {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('ratings');
  const [decade, setDecade] = useState(null);
  const [dotCount, setDotCount] = useState(1);
  const navigate = useNavigate();
  
  const decades = [1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

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

  // Fetch data when sortBy changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        let response;
        
        if (sortBy === 'decade') {
          // Fetch actors by decade
          if (decade) {
            response = await api.get(`/api/actors/by-decade?decade=${decade}&limit=10`);
            setActors(response.data.decades || []);
          } else {
            // Default to 2010s if no decade selected
            response = await api.get(`/api/actors/by-decade?decade=2010&limit=10`);
            setActors(response.data.decades || []);
            setDecade(2010);
          }
        } else {
          // Fetch top actors by sortBy criteria
          response = await api.get(`/api/actors/top?sortBy=${sortBy}&limit=10`);
          setActors(response.data.actors || []);
        }
      } catch (err) {
        setError(`Failed to load actors: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sortBy, decade]);

  const handleSortByChange = (event) => {
    const newSortBy = event.target.value;
    setSortBy(newSortBy);
    
    // Reset decade if changing from 'decade' sorting
    if (newSortBy !== 'decade') {
      setDecade(null);
    } else if (newSortBy === 'decade' && !decade) {
      // Set a default decade if choosing decade sorting
      setDecade(2010);
    }
  };

  const handleDecadeChange = (event) => {
    setDecade(event.target.value);
  };

  const renderActorsTable = () => {
    if (sortBy === 'decade') {
      return (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell align="right"><strong>Nominated Films</strong></TableCell>
              <TableCell align="right"><strong>Total Films</strong></TableCell>
              <TableCell align="right"><strong>Nomination %</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {actors.map((actor, index) => {
              const actorName = actor.actor_name || actor.primaryname || "Unknown";
              const actorId = actor.nconst || 'nm0000001';
              
              return (
                <TableRow
                  key={index}
                  hover
                  onClick={() => navigate(`/actors/${actorId}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{actorName}</TableCell>
                  <TableCell align="right">{actor.nominated_films}</TableCell>
                  <TableCell align="right">{actor.total_films}</TableCell>
                  <TableCell align="right">{actor.nomination_percentage}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      );
    } else {
      return (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell align="right">
                <strong>{sortBy === 'ratings' 
                  ? 'Average Rating' 
                  : sortBy === 'nominations'
                  ? 'Nominations'
                  : 'Box Office Total'}</strong>
              </TableCell>
              {sortBy === 'boxOffice' && (
                <TableCell align="right"><strong>Movies</strong></TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {actors.map((actor, index) => {
              const actorName = actor.primaryname || "Unknown";
              const actorId = actor.nconst || 'nm0000001';
              
              return (
                <TableRow
                  key={index}
                  hover
                  onClick={() => navigate(`/actors/${actorId}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{actorName}</TableCell>
                  <TableCell align="right">
                    {sortBy === 'ratings' 
                      ? (parseFloat(actor.averagerating).toFixed(2) || 'N/A') 
                      : sortBy === 'nominations'
                      ? (actor.nominations || 'N/A')
                      : `$${(parseInt(actor.boxofficetotal || 0) / 1000000).toFixed(1)}M`}
                  </TableCell>
                  {sortBy === 'boxOffice' && (
                    <TableCell align="right">{actor.moviecount}</TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
          <PersonIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4">Actors</Typography>
        </Box>

        <Box mb={3}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={handleSortByChange}
            >
              <MenuItem value="ratings">Average Rating</MenuItem>
              <MenuItem value="nominations">Number of Nominations</MenuItem>
              <MenuItem value="boxOffice">Box Office Revenue</MenuItem>
              <MenuItem value="decade">By Decade</MenuItem>
            </Select>
          </FormControl>

          {sortBy === 'decade' && (
            <FormControl fullWidth>
              <InputLabel>Select Decade</InputLabel>
              <Select
                value={decade || 2010}
                label="Select Decade"
                onChange={handleDecadeChange}
              >
                {decades.map((dec) => (
                  <MenuItem key={dec} value={dec}>{dec}s</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {loading ? (
          renderLoadingMessage()
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
            {renderActorsTable()}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ActorPage;