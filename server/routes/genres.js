const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// Get top genres
router.get('/top', async (req, res) => {
    try {
        const { sortBy = 'revenue', startYear, endYear, limit = 10 } = req.query;
        
        const query = `
            WITH genre_stats AS (
                SELECT 
                    g.genre,
                    SUM(t.revenue) as total_revenue,
                    COUNT(DISTINCT a.awardid) as total_awards
                FROM 
                    public.genres g
                    JOIN public.tmdb t ON g.tconst = t.tconst
                    LEFT JOIN public.theoscaraward a ON g.tconst = a.filmid
                WHERE 
                    ${startYear ? 't.release_date >= $1 AND' : ''}
                    ${endYear ? 't.release_date <= $2 AND' : ''}
                    TRUE
                GROUP BY 
                    g.genre
            )
            SELECT 
                genre,
                total_revenue,
                total_awards
            FROM 
                genre_stats
            ORDER BY 
                ${sortBy === 'revenue' ? 'total_revenue DESC' : 'total_awards DESC'}
            LIMIT $3
        `;

        const params = [];
        if (startYear) params.push(startYear);
        if (endYear) params.push(endYear);
        params.push(limit);

        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No genres found' });
        }
        res.json({ genres: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching top genres' });
    }
});

// Get highest grossing film per genre
router.get('/highest-grossing', async (req, res) => {
    try {
        const { startYear, endYear } = req.query;
        
        const query = `
            WITH ranked_films AS (
                SELECT 
                    g.genre,
                    t.title,
                    t.revenue,
                    ROW_NUMBER() OVER (PARTITION BY g.genre ORDER BY t.revenue DESC) as rank
                FROM 
                    public.genres g
                    JOIN public.tmdb t ON g.tconst = t.tconst
                    LEFT JOIN public.theoscaraward a ON g.tconst = a.filmid
                WHERE 
                    ${startYear ? 't.release_date >= $1 AND' : ''}
                    ${endYear ? 't.release_date <= $2 AND' : ''}
                    TRUE
            )
            SELECT 
                genre,
                title,
                revenue
            FROM 
                ranked_films
            WHERE 
                rank = 1
        `;

        const params = [];
        if (startYear) params.push(startYear);
        if (endYear) params.push(endYear);

        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No films found' });
        }
        res.json({ films: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching highest grossing films' });
    }
});

// Get genre details
router.get('/:genre', async (req, res) => {
    try {
        const { genre } = req.params;
        const { sortBy = 'revenue' } = req.query;
        
        const query = `
            WITH genre_movies AS (
                SELECT 
                    g.tconst,
                    t.title,
                    t.revenue,
                    COUNT(DISTINCT a.awardid) as award_count
                FROM 
                    public.genres g
                    JOIN public.tmdb t ON g.tconst = t.tconst
                    LEFT JOIN public.theoscaraward a ON g.tconst = a.filmid
                WHERE 
                    g.genre = $1
                GROUP BY 
                    g.tconst, t.title, t.revenue
            )
            SELECT 
                tconst,
                title,
                revenue,
                award_count
            FROM 
                genre_movies
            ORDER BY 
                ${sortBy === 'revenue' ? 'revenue DESC' : 'award_count DESC'}
        `;

        const result = await pool.query(query, [genre]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Genre not found' });
        }
        res.json({ movies: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching genre details' });
    }
});

module.exports = router; 