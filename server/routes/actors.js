const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// Get top actors by rating or awards
router.get('/top', async (req, res) => {
    try {
        const { sortBy = 'ratings', limit = 10 } = req.query;
        let query;

        if (sortBy === 'ratings') {
            query = `
                WITH PrincipalsOnActors AS (
                    SELECT tconst, nconst
                    FROM public.titleprincipals
                    WHERE category = 'actor' OR category = 'actress'
                ),
                JoinedWithRatings AS (
                    SELECT pa.tconst, pa.nconst, r.averagerating
                    FROM PrincipalsOnActors pa
                    JOIN public.titleratings r ON pa.tconst = r.tconst
                ),
                AvgRatingsPerActor AS (
                    SELECT nconst, AVG(averagerating) as averageratingactor
                    FROM JoinedWithRatings
                    GROUP BY nconst
                    HAVING COUNT(*) >= 3
                ),
                RankedActors AS (
                    SELECT nconst, averageratingactor, 
                           DENSE_RANK() OVER (ORDER BY averageratingactor DESC) as rank
                    FROM AvgRatingsPerActor
                )
                SELECT nb.primaryname, ra.averageratingactor AS averagerating
                FROM RankedActors ra
                JOIN public.namebasics nb ON ra.nconst = nb.nconst
                WHERE ra.rank <= $1
                ORDER BY ra.averageratingactor DESC
            `;
        } else if (sortBy === 'nominations') {
            query = `
                WITH OscarsForActors AS (
                    SELECT nconst, awardid
                    FROM public.namebasics nb
                    JOIN public.theoscaraward oa ON nb.nconst::text = ANY(oa.nomineeids)
                    WHERE category = 'actor' OR category = 'actress'
                ),
                NomCounts AS (
                    SELECT nconst, COUNT(awardid) AS nominations
                    FROM OscarsForActors
                    GROUP BY nconst
                ),
                RankedActors AS (
                    SELECT nconst, nominations, 
                           DENSE_RANK() OVER (ORDER BY nominations DESC) as rank 
                    FROM NomCounts
                )
                SELECT nb.primaryname, ra.nominations
                FROM RankedActors ra
                JOIN public.namebasics nb ON ra.nconst = nb.nconst
                WHERE ra.rank <= $1
                ORDER BY ra.nominations DESC
            `;
        }

        const result = await pool.query(query, [limit]);
        res.json({ actors: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching top actors' });
    }
});

// Get actors with most nominated films by decade
router.get('/by-decade', async (req, res) => {
    try {
        const { decade, limit = 3 } = req.query;
        const query = `
            WITH actor_films AS (
                SELECT 
                    tp.nconst,
                    nb.primaryname AS actor_name,
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
                    (tp.category = 'actor' OR tp.category = 'actress')
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
            actor_nominations AS (
                SELECT 
                    af.nconst,
                    af.actor_name,
                    af.decade,
                    COUNT(DISTINCT af.tconst) AS total_films,
                    COUNT(DISTINCT CASE WHEN on.filmid IS NOT NULL THEN af.tconst END) AS nominated_films
                FROM 
                    actor_films af
                LEFT JOIN 
                    oscar_nominations on ON af.tconst = on.filmid
                GROUP BY 
                    af.nconst, af.actor_name, af.decade
            ),
            top_actors_by_decade AS (
                SELECT 
                    decade,
                    nconst,
                    actor_name,
                    nominated_films,
                    total_films,
                    RANK() OVER (PARTITION BY decade ORDER BY nominated_films DESC) AS decade_rank
                FROM 
                    actor_nominations
                WHERE 
                    nominated_films > 0
            )
            SELECT 
                decade,
                actor_name,
                nominated_films,
                total_films,
                ROUND((nominated_films::numeric / total_films) * 100, 2) AS nomination_percentage
            FROM 
                top_actors_by_decade
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
        res.status(500).json({ error: 'An error occurred while fetching actors by decade' });
    }
});

// Get actor details
router.get('/:actorId', async (req, res) => {
    try {
        const { actorId } = req.params;
        const query = `
            WITH actor_movies AS (
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
                WHERE a.nconst = $1 AND (p.category = 'actor' OR p.category = 'actress')
            )
            SELECT 
                a.nconst,
                a.primaryname as name,
                COUNT(DISTINCT CASE WHEN am.iswinner THEN am.tconst END) as totalawards,
                COUNT(DISTINCT am.tconst) as totalnominations,
                COALESCE(SUM(am.revenue), 0) as totalboxoffice,
                AVG(am.averagerating) as averagerating,
                json_agg(
                    json_build_object(
                        'tconst', am.tconst,
                        'title', am.title,
                        'year', am.year,
                        'averagerating', am.averagerating,
                        'revenue', am.revenue,
                        'awards', (
                            SELECT json_agg(
                                json_build_object(
                                    'category', am2.category,
                                    'year', am2.awardyear,
                                    'iswinner', am2.iswinner
                                )
                            )
                            FROM actor_movies am2
                            WHERE am2.tconst = am.tconst
                        )
                    )
                ) as movies
            FROM public.namebasics a
            LEFT JOIN actor_movies am ON true
            WHERE a.nconst = $1
            GROUP BY a.nconst, a.primaryname
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

module.exports = router; 