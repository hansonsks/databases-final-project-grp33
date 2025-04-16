const express = require('express');
const cors = require('cors');

// Mock the database pool before importing routes
jest.mock('../database/pool', () => ({
    query: jest.fn().mockImplementation(() => Promise.resolve({ rows: [] })),
    end: jest.fn()
}));

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Import and use routes
const filmsRouter = require('../routes/films');
const actorsRouter = require('../routes/actors');
const directorsRouter = require('../routes/directors');
const genresRouter = require('../routes/genres');
const awardsRouter = require('../routes/awards');

app.use('/films', filmsRouter);
app.use('/actors', actorsRouter);
app.use('/directors', directorsRouter);
app.use('/genres', genresRouter);
app.use('/awards', awardsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

module.exports = app; 