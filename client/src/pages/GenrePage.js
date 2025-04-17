import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';

const GenrePage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <MovieFilterIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Genres
          </Typography>
        </Box>
        <Typography variant="body1" paragraph>
          This page will provide analytics and visualizations about movie genres, including top-performing
          genres by revenue, awards, and critical reception. Users will be able to explore trends in genre
          popularity over time.
        </Typography>
        <Typography variant="body1">
          Implementation coming soon...
        </Typography>
      </Paper>
    </Container>
  );
};

export default GenrePage;