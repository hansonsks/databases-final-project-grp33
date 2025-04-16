const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

//complex query, orders by roi
router.get('/highest-roi', async (req, res) => {
    try {
        const { yearStart = 2000, yearEnd = 2023, limit = 10 } = req.query;
        const query = `
            WITH film_financials AS (
                SELECT 
                    m.imdb_id as tconst,
                    m.budget,
                    m.revenue,
                    CASE 
                        WHEN m.budget > 0 THEN (m.revenue::float / m.budget)
                        ELSE NULL
                    END AS roi
                FROM 
                    public.tmdb m
                WHERE 
                    m.budget > 1000000
                    AND m.revenue > 0
            ),
            film_details AS (
                SELECT 
                    b.tconst,
                    b.primarytitle,
                    b.startyear,
                    r.averagerating,
                    r.numvotes,
                    ff.budget,
                    ff.revenue,
                    ff.roi
                FROM 
                    public.titlebasics b
                JOIN 
                    film_financials ff ON b.tconst = ff.tconst
                LEFT JOIN 
                    public.titleratings r ON b.tconst = r.tconst
                WHERE r.numvotes > 10000
            ),
            yearly_top_roi AS (
                SELECT 
                    startyear,
                    tconst,
                    primarytitle,
                    averagerating,
                    budget,
                    revenue,
                    roi,
                    RANK() OVER (PARTITION BY startyear ORDER BY roi DESC) AS roi_rank
                FROM 
                    film_details
            )
            SELECT 
                yt.startyear AS year,
                yt.primarytitle AS film_title,
                yt.averagerating AS imdb_rating,
                yt.budget,
                yt.revenue,
                ROUND(yt.roi::numeric, 2) AS return_on_investment,
                EXISTS (
                    SELECT 1
                    FROM public.theoscaraward o
                    WHERE o.filmid = yt.tconst
                    AND o.iswinner = TRUE
                ) AS won_oscar,
                (
                    SELECT string_agg(n.primaryname, ', ')
                    FROM public.titleprincipals p
                    JOIN public.namebasics n ON p.nconst = n.nconst
                    WHERE p.tconst = yt.tconst
                    AND p.category = 'director'
                ) AS director
            FROM 
                yearly_top_roi yt
            WHERE 
                roi_rank = 1
                AND startyear BETWEEN $1 AND $2
            ORDER BY 
                yt.roi DESC
            LIMIT $3
        `;

        const result = await pool.query(query, [yearStart, yearEnd, limit]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No films found' });
        }
        res.json({ films: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching films with highest ROI' });
    }
});

//all the movies a certain actor has been in
router.get('/by-actor/:actorName', async (req, res) => {
    try {
        const { actorName } = req.params;
        const query = `
            SELECT 
                t.tconst,
                t.primarytitle AS title,
                t.startyear AS year,
                r.averagerating,
                m.revenue
            FROM 
                public.namebasics n
            JOIN 
                public.titleprincipals p ON n.nconst = p.nconst
            JOIN 
                public.titlebasics t ON p.tconst = t.tconst
            LEFT JOIN 
                public.titleratings r ON t.tconst = r.tconst
            LEFT JOIN 
                public.tmdb m ON t.tconst = m.imdb_id
            WHERE 
                n.primaryname = $1
                AND p.category IN ('actor', 'actress')
            ORDER BY 
                t.startyear DESC
        `;

        const result = await pool.query(query, [actorName]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Actor not found or no films found' });
        }
        res.json({ actor: actorName, films: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching films by actor' });
    }
});

//top movies by genre
router.get('/top-by-genre/:genreName', async (req, res) => {
    try {
        const { genreName } = req.params;
        const { limit = 10 } = req.query;
        const query = `
            WITH GenreMovies AS (
                SELECT tconst, primarytitle
                FROM public.titlebasics
                WHERE $1 = ANY(genres)
            )
            SELECT 
                t.tconst,
                t.primarytitle AS title,
                t.startyear AS year,
                r.averagerating,
                m.revenue
            FROM GenreMovies t
            JOIN public.tmdb m ON t.tconst = m.imdb_id
            LEFT JOIN public.titleratings r ON t.tconst = r.tconst
            ORDER BY m.revenue DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [genreName, limit]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Genre not found or no films found' });
        }
        res.json({ genre: genreName, films: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching top movies by genre' });
    }
});

module.exports = router; 