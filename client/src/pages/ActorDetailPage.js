import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container, Typography, CircularProgress, Paper,
  Divider, Box, List, ListItem, ListItemText
} from '@mui/material';
import { fetchActorDetails } from '../utils/api';

const ActorDetailPage = () => {
  const { actorId } = useParams();
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActor = async () => {
      try {
        const data = await fetchActorDetails(actorId);

        // Deduplicate movies based on tconst
        const deduplicatedMovies = {};
        for (const movie of data.movies) {
          if (!deduplicatedMovies[movie.tconst]) {
            deduplicatedMovies[movie.tconst] = {
              ...movie,
              awards: []
            };
          }
          const existing = deduplicatedMovies[movie.tconst].awards.map(a => `${a.category}-${a.year}`);
          for (const award of movie.awards || []) {
            const key = `${award.category}-${award.year}`;
            if (!existing.includes(key)) {
              deduplicatedMovies[movie.tconst].awards.push(award);
            }
          }
        }

        data.movies = Object.values(deduplicatedMovies);
        setActor(data);
      } catch (err) {
        console.error('Failed to load actor:', err);
      } finally {
        setLoading(false);
      }
    };
    loadActor();
  }, [actorId]);

  if (loading) {
    return <CircularProgress />;
  }

  if (!actor) {
    return <Typography>Actor not found.</Typography>;
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>{actor.name}</Typography>
        <Typography variant="subtitle1">Average Rating: {actor.averagerating?.toFixed(2)}</Typography>
        <Typography variant="subtitle1">Total Awards: {actor.totalawards}</Typography>
        <Typography variant="subtitle1">
          Total Box Office: {actor.totalboxoffice > 0 ? `$${actor.totalboxoffice.toLocaleString()}` : 'Unknown'}
        </Typography>

        <Divider sx={{ my: 3 }} />
        <Typography variant="h6">Filmography</Typography>

        {actor.movies.map((movie, idx) => (
          <Box key={idx} sx={{ my: 3 }}>
            <Typography variant="subtitle1">
              <strong>{movie.title}</strong> ({movie.year})
            </Typography>
            <Typography>Rating: {movie.averagerating ?? 'N/A'}</Typography>
            <Typography>
              Revenue: {movie.revenue && movie.revenue > 0 ? `$${movie.revenue.toLocaleString()}` : 'Unknown'}
            </Typography>

            {movie.awards?.length > 0 && (
              <List dense>
                {movie.awards.map((award, i) => (
                  <ListItem key={i}>
                    <ListItemText
                      primary={`${award.category} (${award.year}) - ${award.iswinner ? 'Winner' : 'Nominated'}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        ))}
      </Paper>
    </Container>
  );
};

export default ActorDetailPage;
