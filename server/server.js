const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Database connection
const pool = new Pool(config.DB_CONFIG);

// Test database connection
pool.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Database connection error:', err));

// Import routes
const movieRoutes = require('./routes/movies');
const actorRoutes = require('./routes/actors');
const directorRoutes = require('./routes/directors');
const genreRoutes = require('./routes/genres');
const filmRoutes = require('./routes/films');
const awardRoutes = require('./routes/awards');

// Use routes
app.use('/api/movies', movieRoutes);
app.use('/api/actors', actorRoutes);
app.use('/api/directors', directorRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/films', filmRoutes);
app.use('/api/awards', awardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = config.API_CONFIG.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 