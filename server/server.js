const express = require('express');
const cors = require('cors');
const { API_CONFIG } = require('./config');


const filmsRouter = require('./routes/films');
const actorsRouter = require('./routes/actors');
const directorsRouter = require('./routes/directors');
const genresRouter = require('./routes/genres');
const awardsRouter = require('./routes/awards');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/films', filmsRouter);
app.use('/api/actors', actorsRouter);
app.use('/api/directors', directorsRouter);
app.use('/api/genres', genresRouter);
app.use('/api/awards', awardsRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', message: 'API is running' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = API_CONFIG.port;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 