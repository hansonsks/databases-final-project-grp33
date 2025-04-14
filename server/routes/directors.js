const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// top director by rating or awards
router.get('/top', async (req, res) => {
    try {
        const { sortBy = 'ratings', limit = 10 } = req.query;
        let query;

        if (sortBy === 'ratings') {
            query = `
                WITH PrincipalsOnDirectors AS (
                    SELECT tconst, nconst
                    FROM title.principals
                    WHERE category = 'director'
                ),
                JoinedWithRatings AS (
                    SELECT pd.tconst, pd.nconst, r.averageRating
                    FROM PrincipalsOnDirectors pd
                    JOIN title.ratings r ON pd.tconst = r.tconst
                ),
                AvgRatingsPerDirector AS (
                    SELECT nconst, AVG(averageRating) as averageRatingDirector
                    FROM JoinedWithRatings
                    GROUP BY nconst
                    HAVING COUNT(*) >= 3
                ),
                RankedDirectors AS (
                    SELECT nconst, averageRatingDirector, 
                           DENSE_RANK() OVER (ORDER BY averageRatingDirector DESC) as rank
                    FROM AvgRatingsPerDirector
                )
                SELECT nb.primaryName, rd.averageRatingDirector AS averageRating
                FROM RankedDirectors rd
                JOIN name.basics nb ON rd.nconst = nb.nconst
                WHERE rd.rank <= $1
                ORDER BY rd.averageRatingDirector DESC
            `;
        } else if (sortBy === 'nominations') {
            query = `
                WITH OscarsForDirectors AS (
                    SELECT nconst, NomId
                    FROM name.basics nb
                    JOIN the_oscar_award oa ON nb.nconst = ANY(oa.nomineeIds)
                    WHERE category = 'director'
                ),
                NomCounts AS (
                    SELECT nconst, COUNT(NomId) AS nominations
                    FROM OscarsForDirectors
                    GROUP BY nconst
                ),
                RankedDirectors AS (
                    SELECT nconst, nominations, 
                           DENSE_RANK() OVER (ORDER BY nominations DESC) as rank 
                    FROM NomCounts
                )
                SELECT nb.primaryName, rd.nominations
                FROM RankedDirectors rd
                JOIN name.basics nb ON rd.nconst = nb.nconst
                WHERE rd.rank <= $1
                ORDER BY rd.nominations DESC
            `;
        }

        const result = await pool.query(query, [limit]);
        res.json({ directors: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching top directors' });
    }
});

// complex query - directors with most nominated films by decade
router.get('/by-decade', async (req, res) => {
    try {
        const { decade, limit = 3 } = req.query;
        const query = `
            WITH director_films AS (
                SELECT 
                    tp.nconst,
                    nb.primaryName AS director_name,
                    tb.tconst,
                    tb.primaryTitle,
                    tb.startYear,
                    (tb.startYear / 10) * 10 AS decade
                FROM 
                    title.principals tp
                JOIN 
                    name.basics nb ON tp.nconst = nb.nconst
                JOIN 
                    title.basics tb ON tp.tconst = tb.tconst
                WHERE 
                    tp.category = 'director'
                    AND tb.startYear IS NOT NULL
            ),
            oscar_nominations AS (
                SELECT 
                    tconst,
                    COUNT(*) AS nomination_count
                FROM 
                    the_oscar_award
                GROUP BY 
                    tconst
            ),
            director_nominations AS (
                SELECT 
                    df.nconst,
                    df.director_name,
                    df.decade,
                    COUNT(DISTINCT df.tconst) AS total_films,
                    COUNT(DISTINCT CASE WHEN on.tconst IS NOT NULL THEN df.tconst END) AS nominated_films
                FROM 
                    director_films df
                LEFT JOIN 
                    oscar_nominations on ON df.tconst = on.tconst
                GROUP BY 
                    df.nconst, df.director_name, df.decade
            ),
            top_directors_by_decade AS (
                SELECT 
                    decade,
                    nconst,
                    director_name,
                    nominated_films,
                    total_films,
                    RANK() OVER (PARTITION BY decade ORDER BY nominated_films DESC) AS decade_rank
                FROM 
                    director_nominations
                WHERE 
                    nominated_films > 0
            )
            SELECT 
                decade,
                director_name,
                nominated_films,
                total_films,
                ROUND((nominated_films::float / total_films) * 100, 2) AS nomination_percentage
            FROM 
                top_directors_by_decade
            WHERE 
                decade_rank <= $1
                ${decade ? 'AND decade = $2' : ''}
            ORDER BY 
                decade, decade_rank
        `;

        const params = [limit];
        if (decade) params.push(decade);
        
        const result = await pool.query(query, params);
        res.json({ decades: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching directors by decade' });
    }
});

// director details
router.get('/:directorId', async (req, res) => {
    try {
        const { directorId } = req.params;
        const query = `
            WITH director_movies AS (
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
                LEFT JOIN the_oscar_award o ON t.tconst = o.filmId
                WHERE a.nconst = $1 AND p.category = 'director'
            )
            SELECT 
                a.nconst,
                a.primaryName as name,
                COUNT(DISTINCT CASE WHEN dm.isWinner THEN dm.tconst END) as totalAwards,
                COUNT(DISTINCT dm.tconst) as totalNominations,
                COALESCE(SUM(dm.revenue), 0) as totalBoxOffice,
                AVG(dm.averageRating) as averageRating,
                json_agg(
                    json_build_object(
                        'tconst', dm.tconst,
                        'title', dm.title,
                        'year', dm.year,
                        'averageRating', dm.averageRating,
                        'revenue', dm.revenue,
                        'awards', (
                            SELECT json_agg(
                                json_build_object(
                                    'category', dm2.category,
                                    'year', dm2.awardYear,
                                    'isWinner', dm2.isWinner
                                )
                            )
                            FROM director_movies dm2
                            WHERE dm2.tconst = dm.tconst
                        )
                    )
                ) as movies
            FROM name.basics a
            LEFT JOIN director_movies dm ON true
            WHERE a.nconst = $1
            GROUP BY a.nconst, a.primaryName
        `;
        
        const result = await pool.query(query, [directorId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Director not found' });
        }
        res.json({ director: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching director details' });
    }
});

module.exports = router; 