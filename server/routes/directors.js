const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// top director by rating or awards
router.get('/top', async (req, res) => {
    try {
        const { sortBy = 'ratings', limit = 10, order = 'desc' } = req.query;
        
        // Validate sort order
        const sortOrder = ['asc', 'desc'].includes(order?.toLowerCase())
            ? order.toLowerCase()
            : 'desc';
            
        // Parse limit as integer with fallback to default
        const parsedLimit = parseInt(limit, 10) || 10;
        
        console.log(`Executing directors query with limit: ${parsedLimit}, sortBy: ${sortBy}, order: ${sortOrder}`);
        
        let query;

        if (sortBy === 'ratings') {
            query = `
                SELECT nb.nconst,
                        nb.primaryname,
                        ar.avg_rating AS averagerating
                FROM   mv_director_avg_rating ar
                JOIN   namebasics nb USING (nconst)
                ORDER BY ar.avg_rating ${sortOrder}
                LIMIT $1;
            `;
        } else if (sortBy === 'nominations') {
            query = `
                SELECT nb.nconst,
                        nb.primaryname,
                        n.nominations
                FROM   mv_director_nominations n
                JOIN   namebasics nb USING (nconst)
                ORDER BY n.nominations ${sortOrder}
                LIMIT $1;
            `;
        } else if (sortBy === 'boxOffice') {
            query = `
                SELECT nb.nconst,
                        nb.primaryname,
                        r.total_revenue AS boxofficetotal,
                        r.movie_count  AS moviecount
                FROM   mv_director_revenue r
                JOIN   namebasics nb USING (nconst)
                ORDER BY r.total_revenue ${sortOrder}
                LIMIT $1;
            `;
        } else {
            return res.status(400).json({ error: 'Invalid sortBy parameter' });
        }

        const result = await pool.query(query, [parsedLimit]);
        
        res.json({ 
            directors: result.rows,
            limit: parsedLimit,
            sortBy,
            order: sortOrder
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching top directors' });
    }
});

// complex query - directors with most nominated films by decade
router.get('/by-decade', async (req, res) => {
    try {
        const { decade, limit = 3, order = 'desc' } = req.query;
        
        // Validate sort order
        const sortOrder = ['asc', 'desc'].includes(order?.toLowerCase())
            ? order.toLowerCase()
            : 'desc';
            
        // Parse limit as integer with fallback to default
        const parsedLimit = parseInt(limit, 10) || 3;

        const query = `
        SELECT
            m.decade,
            m.nconst,
            nb.primaryname          AS director_name,
            m.nominated_films,
            m.total_films,
            ROUND(m.nominated_films::numeric / m.total_films * 100, 2)
                AS nomination_percentage
        FROM   mv_director_decade_noms m
        JOIN   namebasics nb USING (nconst)
        WHERE  m.nominated_films > 0
        ${decade ? 'AND m.decade = $2' : ''}
        ORDER BY m.decade, m.nominated_films ${sortOrder}
        LIMIT  $1;
        `;

        const params = [parsedLimit];
        if (decade) params.push(decade);

        const result = await pool.query(query, params);
        
        res.json({ 
            decades: result.rows,
            limit: parsedLimit,
            decade: decade || null,
            order: sortOrder
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching directors by decade' });
    }
});

// director details
router.get('/:directorId', async (req, res) => {
    try {
        const { directorId } = req.params;
        console.log(`Getting details for director ID: ${directorId}`);
        
        const query = `
            WITH director_movies AS (
                SELECT 
                    t.tconst,
                    t.primarytitle as title,
                    t.startyear as year,
                    r.averagerating,
                    m.revenue,
                    o.category,
                    o.year as awardyear,
                    o.iswinner
                FROM public.namebasics a
                JOIN public.titleprincipals p ON a.nconst = p.nconst
                JOIN public.titlebasics t ON p.tconst = t.tconst
                LEFT JOIN public.titleratings r ON t.tconst = r.tconst
                LEFT JOIN public.tmdb m ON t.tconst = m.imdb_id
                LEFT JOIN public.theoscaraward o ON t.tconst = o.filmid
                WHERE a.nconst = $1 AND p.category = 'director'
                -- Add order and limit to avoid excessive data
                ORDER BY t.startyear DESC
                LIMIT 100
            )
            SELECT 
                a.nconst,
                a.primaryname as name,
                COUNT(DISTINCT CASE WHEN dm.iswinner THEN dm.tconst END) as totalawards,
                COUNT(DISTINCT dm.tconst) as totalnominations,
                COALESCE(SUM(dm.revenue), 0) as totalboxoffice,
                AVG(dm.averagerating) as averagerating,
                json_agg(
                    json_build_object(
                        'tconst', dm.tconst,
                        'title', dm.title,
                        'year', dm.year,
                        'averagerating', dm.averagerating,
                        'revenue', dm.revenue,
                        'awards', (
                            SELECT json_agg(
                                CASE WHEN dm2.category IS NOT NULL THEN
                                    json_build_object(
                                        'category', dm2.category,
                                        'year', dm2.awardyear,
                                        'iswinner', dm2.iswinner
                                    )
                                ELSE NULL
                                END
                            )
                            FROM director_movies dm2
                            WHERE dm2.tconst = dm.tconst
                        )
                    )
                ) as movies
            FROM public.namebasics a
            LEFT JOIN director_movies dm ON true
            WHERE a.nconst = $1
            GROUP BY a.nconst, a.primaryname
        `;
        
        const result = await pool.query(query, [directorId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Director not found' });
        }
        
        // Process the director data to clean up null values in awards
        const director = result.rows[0];
        
        // Clean up movies and awards arrays
        if (director.movies) {
            director.movies = director.movies.filter(movie => movie && movie.tconst);
            
            // Clean up awards arrays
            director.movies.forEach(movie => {
                if (movie.awards) {
                    // Filter out null entries
                    movie.awards = movie.awards.filter(award => award !== null);
                }
            });
        }
        
        res.json({ director });
    } catch (err) {
        console.error('Error fetching director details:', err);
        res.status(500).json({ error: 'An error occurred while fetching director details' });
    }
});

module.exports = router;