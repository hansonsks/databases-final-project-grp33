import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box,
  Tabs, Tab, Table, TableHead, TableRow, TableCell,
  TableBody, CircularProgress, Alert, Select, MenuItem
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ActorPage = () => {
  const [tab, setTab] = useState(0);
  const [topActors, setTopActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decades, setDecades] = useState([]);
  const [selectedDecade, setSelectedDecade] = useState('');
  const [actorsByDecade, setActorsByDecade] = useState([]);
  const navigate = useNavigate();

  const fetchActors = async (sortBy = 'ratings') => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/actors/top?sortBy=${sortBy}`);
      setTopActors(response.data.actors || []);
    } catch (err) {
      setError('Failed to load actors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecades = async () => {
    try {
      const response = await api.get('/api/actors/decades');
      const decadeList = response.data.decades || [];
      setDecades(decadeList);
      if (decadeList.length > 0) {
        setSelectedDecade(decadeList[0]);
      }
    } catch (err) {
      console.error('Failed to load decades', err);
    }
  };

  const fetchActorsByDecade = async (decade) => {
    if (!decade) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/actors/by-decade?decade=${decade}`);
      console.log("API response:", response.data.decades); // Add this line
      setActorsByDecade(response.data.decades || []);
    } catch (err) {
      setError('Failed to load actors by decade');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    fetchActors('ratings');
    fetchDecades();
  }, []);

  useEffect(() => {
    if (tab === 2 && selectedDecade) {
      fetchActorsByDecade(selectedDecade);
    }
  }, [tab, selectedDecade]);

  const handleTabChange = (_, newValue) => {
    setTab(newValue);
    if (newValue === 0) fetchActors('ratings');
    else if (newValue === 1) fetchActors('nominations');
  };

  const displayedActors = tab === 2
    ? [...actorsByDecade].sort((a, b) =>
        (b.nomination_percentage || 0) - (a.nomination_percentage || 0)
      )
    : topActors;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <PersonIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4">Top Actors</Typography>
        </Box>

        <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="By Rating" />
          <Tab label="By Nominations" />
          <Tab label="By Decade" />
        </Tabs>

        {tab === 2 && (
          <Box mb={2}>
            <Typography variant="subtitle1">Select Decade</Typography>
            <Select
              fullWidth
              value={selectedDecade}
              onChange={(e) => setSelectedDecade(e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>Select a decade</MenuItem>
              {decades.map((dec) => (
                <MenuItem key={dec} value={dec}>{dec}s</MenuItem>
              ))}
            </Select>
          </Box>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell align="right">
                  <strong>{tab === 0 ? 'Avg Rating' : tab === 1 ? 'Nominations' : 'Percentage of Films with Oscar Nominations'}</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedActors.map((actor, index) => {
                console.log(actor); // helpful for debugging the response
                const actorId = actor.nconst || actor['nb.nconst'];
                const displayName = actor.primaryname || actor.actor_name;
                const value =
                  tab === 0 ? (actor.averagerating?.toFixed(2) ?? 'N/A') :
                  tab === 1 ? (actor.nominations ?? 'N/A') :
                  isNaN(Number(actor.nomination_percentage))
                    ? '0.00%'
                    : `${Number(actor.nomination_percentage).toFixed(2)}%`

                return (
                  <TableRow
                    key={index}
                    hover
                    onClick={() => navigate(`/actors/${actorId}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{displayName}</TableCell>
                    <TableCell align="right">{value}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Container>
  );
};

export default ActorPage;
