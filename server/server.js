const express = require('express');
const cors = require('cors');
const config = require('./config');

// Import routers
const filmsRouter = require('./routes/films');
const actorsRouter = require('./routes/actors');
const directorsRouter = require('./routes/directors');
const genresRouter = require('./routes/genres');
const awardsRouter = require('./routes/awards');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/films', filmsRouter);
app.use('/api/actors', actorsRouter);
app.use('/api/directors', directorsRouter);
app.use('/api/genres', genresRouter);
app.use('/api/awards', awardsRouter);

// Authentication and user routes
app.use('/auth', authRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', message: 'API is running' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = config.api.port || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});