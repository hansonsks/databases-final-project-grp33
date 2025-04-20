require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config');

// Create the app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const filmsRouter = require('./routes/films');
const actorsRouter = require('./routes/actors');
const directorsRouter = require('./routes/directors');
const genresRouter = require('./routes/genres');
const awardsRouter = require('./routes/awards');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const dashboardRouter = require('./routes/dashboard');

// Mount routes
app.use('/api/films', filmsRouter);
app.use('/api/actors', actorsRouter);
app.use('/api/directors', directorsRouter);
app.use('/api/genres', genresRouter);
app.use('/api/awards', awardsRouter);
app.use('/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;

// Only start server if this file is run directly
if (require.main === module) {
    const PORT = config.api.port || 8080;
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}