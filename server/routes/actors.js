const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// top actor by box office or nominations
router.get('/top', async (req, res) => {
    try {
        const { sortBy = 'boxOffice', limit = 10 } = req.query;
        let query;
        
        if (sortBy === 'awards') {
            query = `
                SELECT 
                    a.nconst,
                    a.primaryName as name,
                    COUNT(DISTINCT o.award_id) as value, 
                    COUNT(DISTINCT t.tconst) as movies
                FROM name.basics a
                LEFT JOIN title.principals p ON a.nconst = p.nconst
                LEFT JOIN title.basics t ON p.tconst = t.tconst
                LEFT JOIN oscars o ON t.tconst = o.imdb_id
                WHERE p.category = 'actor'
                GROUP BY a.nconst, a.primaryName
                ORDER BY value DESC
                LIMIT $1
            `;
        } else {
            query = `
                SELECT 
                    a.nconst,
                    a.primaryName as name,
                    COALESCE(SUM(tm.revenue), 0) as value,
                    COUNT(DISTINCT t.tconst) as movies
                FROM name.basics a
                LEFT JOIN title.principals p ON a.nconst = p.nconst
                LEFT JOIN title.basics t ON p.tconst = t.tconst
                LEFT JOIN tmdb tm ON t.tconst = tm.imdb_id
                WHERE p.category = 'actor'
                GROUP BY a.nconst, a.primaryName
                ORDER BY value DESC
                LIMIT $1
            `;
        }
        
        const result = await pool.query(query, [limit]);
        res.json({ actors: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching top actors' });
    }
});

router.get('/:actorId', async (req, res) => {
    try {
        const { actorId } = req.params;
        const query = `
            WITH actor_movies AS (
                SELECT 
                    t.tconst,
                    t.primaryTitle as title,
                    t.startYear as year,
                    r.averageRating,
                    tm.revenue,
                    o.category,
                    o.year as awardYear,
                    o.isWinner
                FROM name.basics a
                JOIN title.principals p ON a.nconst = p.nconst
                JOIN title.basics t ON p.tconst = t.tconst
                LEFT JOIN title.ratings r ON t.tconst = r.tconst
                LEFT JOIN tmdb tm ON t.tconst = tm.imdb_id
                LEFT JOIN oscars o ON t.tconst = o.imdb_id
                WHERE a.nconst = $1 AND p.category = 'actor'
            )
            SELECT 
                a.nconst,
                a.primaryName as name,
                COUNT(DISTINCT CASE WHEN am.isWinner THEN am.tconst END) as totalAwards,
                COUNT(DISTINCT am.tconst) as totalNominations,
                COALESCE(SUM(am.revenue), 0) as totalBoxOffice,
                AVG(am.averageRating) as averageRating,
                json_agg(
                    json_build_object(
                        'tconst', am.tconst,
                        'title', am.title,
                        'year', am.year,
                        'averageRating', am.averageRating,
                        'revenue', am.revenue,
                        'awards', (
                            SELECT json_agg(
                                json_build_object(
                                    'category', am2.category,
                                    'year', am2.awardYear,
                                    'isWinner', am2.isWinner
                                )
                            )
                            FROM actor_movies am2
                            WHERE am2.tconst = am.tconst
                        )
                    )
                ) as movies
            FROM name.basics a
            LEFT JOIN actor_movies am ON true
            WHERE a.nconst = $1
            GROUP BY a.nconst, a.primaryName
        `;
        
        const result = await pool.query(query, [actorId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Actor not found' });
        }
        res.json({ actor: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching actor details' });
    }
});

router.get('/snubbed', async (req, res) => {
    try {
        const { limit = 10, minNominations = 5 } = req.query;
        const query = `
            WITH actor_awards AS (
                SELECT 
                    a.nconst,
                    a.primaryName as name,
                    COUNT(DISTINCT CASE WHEN o.isWinner THEN o.award_id END) as wins,
                    COUNT(DISTINCT o.award_id) as nominations
                FROM name.basics a
                JOIN title.principals p ON a.nconst = p.nconst
                JOIN title.basics t ON p.tconst = t.tconst
                JOIN oscars o ON t.tconst = o.imdb_id
                WHERE p.category = 'actor'
                GROUP BY a.nconst, a.primaryName
                HAVING COUNT(DISTINCT o.award_id) >= $1
            )
            SELECT 
                nconst,
                name,
                nominations,
                wins,
                CASE 
                    WHEN nominations > 0 THEN wins::float / nominations
                    ELSE 0 
                END as winRatio
            FROM actor_awards
            ORDER BY winRatio ASC
            LIMIT $2
        `;
        
        const result = await pool.query(query, [minNominations, limit]);
        res.json({ actors: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching snubbed actors' });
    }
});

router.get('/flops', async (req, res) => {
    try {
        const { limit = 10, minMovies = 5 } = req.query;
        const query = `
            WITH actor_movies AS (
                SELECT 
                    a.nconst,
                    a.primaryName as name,
                    COUNT(DISTINCT t.tconst) as movieCount,
                    AVG(tm.revenue) as averageBoxOffice
                FROM name.basics a
                JOIN title.principals p ON a.nconst = p.nconst
                JOIN title.basics t ON p.tconst = t.tconst
                JOIN tmdb tm ON t.tconst = tm.imdb_id
                WHERE p.category = 'actor'
                GROUP BY a.nconst, a.primaryName
                HAVING COUNT(DISTINCT t.tconst) >= $1
            )
            SELECT 
                nconst,
                name,
                movieCount,
                averageBoxOffice
            FROM actor_movies
            ORDER BY averageBoxOffice ASC
            LIMIT $2
        `;
        
        const result = await pool.query(query, [minMovies, limit]);
        res.json({ actors: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching flop actors' });
    }
});

router.get('/top-rated', async (req, res) => {
    try {
        const { limit = 20, minFilms = 5, minVotes = 5000 } = req.query;
        const query = `
            WITH actor_ratings AS (
                SELECT 
                    a.nconst,
                    a.primaryName as name,
                    COUNT(DISTINCT t.tconst) as filmCount,
                    AVG(r.averageRating) as averageRating,
                    SUM(r.numVotes) as totalVotes,
                    COUNT(DISTINCT CASE WHEN o.isWinner THEN o.award_id END) as oscarWins,
                    array_agg(DISTINCT t.primaryTitle ORDER BY r.averageRating DESC LIMIT 3) as topRatedFilms
                FROM name.basics a
                JOIN title.principals p ON a.nconst = p.nconst
                JOIN title.basics t ON p.tconst = t.tconst
                JOIN title.ratings r ON t.tconst = r.tconst
                LEFT JOIN oscars o ON t.tconst = o.imdb_id
                WHERE p.category = 'actor'
                GROUP BY a.nconst, a.primaryName
                HAVING COUNT(DISTINCT t.tconst) >= $1 AND SUM(r.numVotes) >= $2
            )
            SELECT 
                nconst,
                name,
                filmCount,
                averageRating,
                totalVotes,
                oscarWins,
                topRatedFilms
            FROM actor_ratings
            ORDER BY averageRating DESC
            LIMIT $3
        `;
        
        const result = await pool.query(query, [minFilms, minVotes, limit]);
        res.json({ actors: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching top-rated actors' });
    }
});

module.exports = router; 