import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const toTwo = (n) => Number(Number(n).toFixed(2));

const buildChartData = (list, metric) =>
  list.map((a) => ({
    name: a.primaryname || a.actor_name,
    value:
      metric === 'ratings'
        ? toTwo(a.averagerating)
        : metric === 'nominations'
        ? Number(a.nominations)
        : metric === 'boxOffice'
        ? toTwo(Number(a.boxofficetotal) / 1_000_000)
        : Number(a.nominated_films),
  }));

const decades = [
  1930, 1940, 1950, 1960, 1970,
  1980, 1990, 2000, 2010, 2020,
];

const ActorPage = () => {
  const navigate = useNavigate();

  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sortBy,  setSortBy]  = useState('ratings');
  const [decade,  setDecade]  = useState(null);
  const [dots,    setDots]    = useState(1);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setDots((p) => (p < 3 ? p + 1 : 1)), 500);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        let res;
        if (sortBy === 'decade') {
          const dec = decade || 2010;
          res = await api.get(`/api/actors/by-decade?decade=${dec}&limit=10`);
          setActors(res.data.decades || []);
          if (!decade) setDecade(dec);
        } else {
          res = await api.get(`/api/actors/top?sortBy=${sortBy}&limit=10`);
          setActors(res.data.actors || []);
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

  const changeSort = (e) => {
    const v = e.target.value;
    setSortBy(v);
    if (v !== 'decade') setDecade(null);
    if (v === 'decade' && !decade) setDecade(2010);
  };

  const chartData = buildChartData(actors, sortBy);
  const metricLabel =
    sortBy === 'ratings'
      ? 'Average Rating'
      : sortBy === 'nominations'
      ? 'Nominations'
      : sortBy === 'boxOffice'
      ? 'Box Office'
      : 'Nominated Films';

  const renderTable = () =>
    sortBy === 'decade' ? (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><strong>Name</strong></TableCell>
            <TableCell align="right"><strong>Nominated Films</strong></TableCell>
            <TableCell align="right"><strong>Total Films</strong></TableCell>
            <TableCell align="right"><strong>Nomination %</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {actors.map((a, i) => (
            <TableRow key={i} hover sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/actors/${a.nconst}`)}
            >
              <TableCell>{a.actor_name}</TableCell>
              <TableCell align="right">{a.nominated_films}</TableCell>
              <TableCell align="right">{a.total_films}</TableCell>
              <TableCell align="right">{a.nomination_percentage}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ) : (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><strong>Name</strong></TableCell>
            <TableCell align="right"><strong>{metricLabel}</strong></TableCell>
            {sortBy === 'boxOffice' && (
              <TableCell align="right"><strong>Movies</strong></TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {actors.map((a, i) => (
            <TableRow key={i} hover sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/actors/${a.nconst}`)}
            >
              <TableCell>{a.primaryname}</TableCell>
              <TableCell align="right">
                {sortBy === 'ratings'
                  ? toTwo(a.averagerating)
                  : sortBy === 'nominations'
                  ? a.nominations
                  : `$${toTwo(Number(a.boxofficetotal) / 1_000_000)}M`}
              </TableCell>
              {sortBy === 'boxOffice' && (
                <TableCell align="right">{a.moviecount}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

  const renderLoading = () => (
    <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px">
      <CircularProgress sx={{ mb: 2 }} />
      <Typography color="text.secondary">
        Crunching data, please wait{'.'.repeat(dots)}
      </Typography>
    </Box>
  );

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
            <Select value={sortBy} label="Sort By" onChange={changeSort}>
              <MenuItem value="ratings">Average Rating</MenuItem>
              <MenuItem value="nominations">Number of Nominations</MenuItem>
              <MenuItem value="boxOffice">Box Office Revenue</MenuItem>
              <MenuItem value="decade">By Decade</MenuItem>
            </Select>
          </FormControl>

          {sortBy === 'decade' && (
            <FormControl fullWidth>
              <InputLabel>Select Decade</InputLabel>
              <Select value={decade || 2010} label="Select Decade" onChange={(e) => setDecade(e.target.value)}>
                {decades.map((d) => (
                  <MenuItem key={d} value={d}>{d}s</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {!loading && !error && actors.length > 0 && (
          <Box sx={{ height: 280, mb: 4 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tickFormatter={(v) => (sortBy === 'boxOffice' ? `$${v}M` : v)} />
                <Tooltip
                  formatter={(v) =>
                    sortBy === 'boxOffice'
                      ? [`$${toTwo(v)} M`, metricLabel]
                      : [v, metricLabel]
                  }
                />
                <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}

        {loading ? renderLoading() : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>{renderTable()}</Box>
        )}
      </Paper>
    </Container>
  );
};

export default ActorPage;
