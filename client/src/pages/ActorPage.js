import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

const ActorPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <PersonIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Actors
          </Typography>
        </Box>
        <Typography variant="body1" paragraph>
          This page will allow users to search for actors and view detailed information about their careers,
          including their filmography, awards, and box office performance.
        </Typography>
        <Typography variant="body1">
          Implementation coming soon...
        </Typography>
      </Paper>
    </Container>
  );
};

export default ActorPage;