const express = require('express');
const cors = require('cors');
const { API_CONFIG } = require('./config');

const filmsRouter = require('./routes/films');
const actorsRouter = require('./routes/actors');
const directorsRouter = require('./routes/directors');
const genresRouter = require('./routes/genres');
const awardsRouter = require('./routes/awards');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/films', filmsRouter);
app.use('/api/actors', actorsRouter);
app.use('/api/directors', directorsRouter);
app.use('/api/genres', genresRouter);
app.use('/api/awards', awardsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Only start the server if this file is run directly
if (require.main === module) {
    const PORT = API_CONFIG.port;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app; 