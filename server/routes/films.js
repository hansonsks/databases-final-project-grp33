const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

//complex query
router.get('/highest-roi', async (req, res) => {
    try {
        const { yearStart = 2000, yearEnd = 2023, limit = 10 } = req.query;
        const query = `
            WITH film_financials AS (
                SELECT 
                    t.imdb_id AS tconst,
                    t.budget,
                    t.revenue,
                    CASE 
                        WHEN t.budget > 0 THEN (t.revenue::float / t.budget)
                        ELSE NULL
                    END AS roi
                FROM 
                    tmdb t
                WHERE 
                    t.budget > 1000000
                    AND t.revenue > 0
            ),
            film_details AS (
                SELECT 
                    b.tconst,
                    b.primaryTitle,
                    b.startYear,
                    r.averageRating,
                    r.numVotes,
                    ff.budget,
                    ff.revenue,
                    ff.roi
                FROM 
                    title.basics b
                JOIN 
                    film_financials ff ON b.tconst = ff.tconst
                LEFT JOIN 
                    title.ratings r ON b.tconst = r.tconst
                WHERE 
                    r.numVotes > 10000
                    AND b.startYear >= $1
                    AND b.startYear <= $2
            ),
            yearly_top_roi AS (
                SELECT 
                    startYear,
                    tconst,
                    primaryTitle,
                    averageRating,
                    budget,
                    revenue,
                    roi,
                    RANK() OVER (PARTITION BY startYear ORDER BY roi DESC) AS roi_rank
                FROM 
                    film_details
            )
            SELECT 
                yt.startYear AS year,
                yt.primaryTitle AS film_title,
                yt.averageRating AS imdb_rating,
                yt.budget,
                yt.revenue,
                ROUND(yt.roi::numeric, 2) AS return_on_investment,
                EXISTS (
                    SELECT 1
                    FROM the_oscar_award o
                    WHERE o.filmId = yt.tconst
                    AND o.isWinner = TRUE
                ) AS won_oscar,
                (
                    SELECT string_agg(n.primaryName, ', ')
                    FROM title.principals p
                    JOIN name.basics n ON p.nconst = n.nconst
                    WHERE p.tconst = yt.tconst
                    AND p.category = 'director'
                ) AS director
            FROM 
                yearly_top_roi yt
            WHERE 
                roi_rank = 1
            ORDER BY 
                startYear DESC
            LIMIT $3
        `;

        const result = await pool.query(query, [yearStart, yearEnd, limit]);
        res.json({ years: result.rows });
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
            WITH TargetNconst AS (
                SELECT nconst
                FROM name.basics
                WHERE (category = 'actor' OR category = 'actress') 
                AND primaryName = $1
            ),
            TargetTconsts AS (
                SELECT tconst
                FROM title.principals
                JOIN TargetNconst ON title.principals.nconst = TargetNconst.nconst
            )
            SELECT DISTINCT 
                t.tconst,
                t.primaryTitle as title,
                t.startYear as year,
                r.averageRating,
                tm.revenue
            FROM title.basics t
            JOIN TargetTconsts ON t.tconst = TargetTconsts.tconst
            LEFT JOIN title.ratings r ON t.tconst = r.tconst
            LEFT JOIN tmdb tm ON t.tconst = tm.imdb_id
            ORDER BY t.startYear DESC
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
                SELECT tconst, primaryTitle, startYear
                FROM title.basics
                WHERE $1 = ANY(genres)
            )
            SELECT 
                t.tconst,
                t.primaryTitle as title,
                t.startYear as year,
                r.averageRating,
                tm.revenue
            FROM GenreMovies t
            JOIN tmdb tm ON t.tconst = tm.imdb_id
            LEFT JOIN title.ratings r ON t.tconst = r.tconst
            ORDER BY tm.revenue DESC
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