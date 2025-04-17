import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import TheatersIcon from '@mui/icons-material/Theaters';

const FilmPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <TheatersIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Films
          </Typography>
        </Box>
        <Typography variant="body1" paragraph>
          This page will allow users to search for films and view detailed information, including cast,
          crew, box office performance, awards, and critical reception. Users will be able to filter
          films by various criteria such as year, genre, and rating.
        </Typography>
        <Typography variant="body1">
          Implementation coming soon...
        </Typography>
      </Paper>
    </Container>
  );
};

export default FilmPage;