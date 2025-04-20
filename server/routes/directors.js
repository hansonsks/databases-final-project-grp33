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
                    FROM public.titleprincipals
                    WHERE category = 'director'
                ),
                JoinedWithRatings AS (
                    SELECT pd.tconst, pd.nconst, r.averagerating
                    FROM PrincipalsOnDirectors pd
                    JOIN public.titleratings r ON pd.tconst = r.tconst
                ),
                AvgRatingsPerDirector AS (
                    SELECT nconst, AVG(averagerating) as averageratingdirector
                    FROM JoinedWithRatings
                    GROUP BY nconst
                    HAVING COUNT(*) >= 3
                ),
                RankedDirectors AS (
                    SELECT nconst, averageratingdirector, 
                           DENSE_RANK() OVER (ORDER BY averageratingdirector DESC) as rank
                    FROM AvgRatingsPerDirector
                )
                SELECT nb.nconst, nb.primaryname, ra.averageratingdirector AS averagerating
                FROM RankedDirectors ra
                JOIN public.namebasics nb ON ra.nconst = nb.nconst
                WHERE ra.rank <= $1
                ORDER BY ra.averageratingdirector DESC
            `;
        } else if (sortBy === 'nominations') {
            query = `
                WITH OscarsForDirectors AS (
                    SELECT nconst, awardid
                    FROM public.namebasics nb
                    JOIN public.theoscaraward oa ON nb.nconst::text = ANY(oa.nomineeids)
                    WHERE category = 'director'
                ),
                NomCounts AS (
                    SELECT nconst, COUNT(awardid) AS nominations
                    FROM OscarsForDirectors
                    GROUP BY nconst
                ),
                RankedDirectors AS (
                    SELECT nconst, nominations, 
                           DENSE_RANK() OVER (ORDER BY nominations DESC) as rank 
                    FROM NomCounts
                )
                SELECT nb.nconst, nb.primaryname, rd.nominations
                FROM RankedDirectors rd
                JOIN public.namebasics nb ON rd.nconst = nb.nconst
                WHERE rd.rank <= $1
                ORDER BY rd.nominations DESC
            `;
        } else if (sortBy === 'boxOffice') {
            query = `
                WITH DirectorFilms AS (
                    SELECT 
                        tp.nconst,
                        tb.tconst,
                        m.revenue
                    FROM 
                        public.titleprincipals tp
                    JOIN 
                        public.titlebasics tb ON tp.tconst = tb.tconst
                    JOIN 
                        public.tmdb m ON tb.tconst = m.imdb_id
                    WHERE 
                        tp.category = 'director'
                        AND m.revenue IS NOT NULL
                        AND m.revenue > 0
                ),
                DirectorTotals AS (
                    SELECT 
                        nconst,
                        SUM(revenue) as total_revenue,
                        COUNT(tconst) as movie_count
                    FROM 
                        DirectorFilms
                    GROUP BY 
                        nconst
                    HAVING 
                        COUNT(tconst) >= 2
                ),
                RankedDirectors AS (
                    SELECT 
                        nconst,
                        total_revenue,
                        movie_count,
                        DENSE_RANK() OVER (ORDER BY total_revenue DESC) as rank
                    FROM 
                        DirectorTotals
                )
                SELECT 
                    nb.nconst, 
                    nb.primaryname,
                    rd.total_revenue as boxOfficeTotal,
                    rd.movie_count as movieCount
                FROM 
                    RankedDirectors rd
                JOIN 
                    public.namebasics nb ON rd.nconst = nb.nconst
                WHERE 
                    rd.rank <= $1
                ORDER BY 
                    rd.total_revenue DESC
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
                    nb.primaryname AS director_name,
                    tb.tconst,
                    tb.primarytitle,
                    tb.startyear,
                    (tb.startyear / 10) * 10 AS decade
                FROM 
                    public.titleprincipals tp
                JOIN 
                    public.namebasics nb ON tp.nconst = nb.nconst
                JOIN 
                    public.titlebasics tb ON tp.tconst = tb.tconst
                WHERE 
                    tp.category = 'director'
                    AND tb.startyear IS NOT NULL
            ),
            oscar_nominations AS (
                SELECT 
                    filmid,
                    COUNT(*) AS nomination_count
                FROM 
                    public.theoscaraward
                GROUP BY 
                    filmid
            ),
            director_nominations AS (
                SELECT 
                    df.nconst,
                    df.director_name,
                    df.decade,
                    COUNT(DISTINCT df.tconst) AS total_films,
                    COUNT(DISTINCT CASE WHEN oscar_nom.filmid IS NOT NULL THEN df.tconst END) AS nominated_films
                FROM 
                    director_films df
                LEFT JOIN 
                    oscar_nominations oscar_nom ON df.tconst = oscar_nom.filmid
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
                nconst,
                director_name,
                nominated_films,
                total_films,
                ROUND((nominated_films::numeric / total_films) * 100, 2) AS nomination_percentage
            FROM 
                top_directors_by_decade
            WHERE 
                decade_rank <= $1
                ${decade ? 'AND decade = $2' : ''}
            ORDER BY 
                decade, decade_rank
            LIMIT 30
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
                                json_build_object(
                                    'category', dm2.category,
                                    'year', dm2.awardyear,
                                    'iswinner', dm2.iswinner
                                )
                            )
                            FROM director_movies dm2
                            WHERE dm2.tconst = dm.tconst AND dm2.category IS NOT NULL
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
        res.json({ director: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching director details' });
    }
});

module.exports = router;