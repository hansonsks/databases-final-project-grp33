const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// get actor awards
router.get('/by-actor/:actorName', async (req, res) => {
    try {
        const { actorName } = req.params;
        
        const query = `
            WITH actor_nconst AS (
                SELECT nconst::text
                FROM public.namebasics
                WHERE ('actor' = ANY(primaryprofession) OR 'actress' = ANY(primaryprofession))
                AND primaryname = $1
                LIMIT 1
            )
            SELECT 
                o.category,
                o.year,
                o.filmtitle,
                o.iswinner,
                o.filmid,
                o.nomineeids
            FROM 
                public.theoscaraward o
            WHERE 
                EXISTS (
                    SELECT 1 
                    FROM actor_nconst an 
                    WHERE an.nconst = ANY(o.nomineeids)
                )
            ORDER BY 
                o.year DESC
        `;

        const result = await pool.query(query, [actorName]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Actor not found or no awards found' });
        }

        res.json({ 
            actor: actorName,
            awards: result.rows 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching actor awards' });
    }
});

// Get awards by category
router.get('/by-category', async (req, res) => {
    try {
        const { category, limit = 10 } = req.query;
        
        if (!category) {
            return res.status(400).json({ error: 'Category parameter is required' });
        }
        
        const query = `
            SELECT 
                o.filmtitle,
                o.year,
                o.iswinner,
                o.filmid,
                o.awardid
            FROM 
                public.theoscaraward o
            WHERE 
                o.category = $1
            ORDER BY 
                o.year DESC, o.iswinner DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [category, limit]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No films found for this category' });
        }

        res.json({ 
            category,
            films: result.rows 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching category films' });
    }
});

router.get('/search-by-awardid', async (req, res) => {
    try {
        const awardid = req.query.awardid;

        const query = `
        WITH film_tconst AS (
            SELECT
                filmid AS tconst,
                category
            FROM public.theoscaraward
            WHERE awardid = $1
        )
        SELECT
            ft.tconst,
            ft.category,
            r.averagerating AS imdb_rating,
            CASE WHEN t.revenue > 0 THEN t.revenue::text ELSE 'N/A' END AS box_office,
            (
                SELECT array_to_string((array_agg(n.primaryname ORDER BY n.nconst ASC))[1:3], ', ')
                FROM public.titleprincipals p
                         JOIN public.namebasics n ON p.nconst = n.nconst
                WHERE p.tconst = ft.tconst
                  AND p.category = 'director'
            ) AS directors,
            (
                SELECT array_to_string((array_agg(n.primaryname ORDER BY n.nconst ASC))[1:3], ', ')
                FROM public.titleprincipals p
                         JOIN public.namebasics n ON p.nconst = n.nconst
                WHERE p.tconst = ft.tconst
                  AND p.category IN ('actor', 'actress')
            ) AS actors
        FROM
            film_tconst ft
                JOIN
            public.titleratings r ON ft.tconst = r.tconst
                JOIN
            public.tmdb t ON ft.tconst = t.imdb_id
        `;

        const result = await pool.query(query, [awardid]);
    
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No films found for this nomination' });
        }

        res.json({
            film: result.rows 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while searching for film' });
    }
});

// Search for details for a film given information about its Oscar nomination
router.get('/search-by-other', async (req, res) => {
    try {
        const title = req.query.title;
        const year = req.query.year;
        const category = req.query.category;
        const iswinner = req.query.iswinner;
        
        // same query as above but not given awardid
        const query = `
        WITH film_tconst AS (
            SELECT
                filmid AS tconst,
                category
            FROM public.theoscaraward
            WHERE filmtitle = $1 AND year = $2 AND category = $3 AND isWinner = $4
            LIMIT 1
        )
        SELECT
            ft.tconst,
            ft.category,
            r.averagerating AS imdb_rating,
            CASE WHEN t.revenue > 0 THEN t.revenue::text ELSE 'N/A' END AS box_office,
            (
                SELECT array_to_string((array_agg(n.primaryname ORDER BY n.nconst ASC))[1:3], ', ')
                FROM public.titleprincipals p
                    JOIN public.namebasics n ON p.nconst = n.nconst
                WHERE p.tconst = ft.tconst
                AND p.category = 'director'
            ) AS directors,
            (
                SELECT array_to_string((array_agg(n.primaryname ORDER BY n.nconst ASC))[1:3], ', ')
                FROM public.titleprincipals p
                    JOIN public.namebasics n ON p.nconst = n.nconst
                WHERE p.tconst = ft.tconst
                AND p.category IN ('actor', 'actress')
            ) AS actors
        FROM
            film_tconst ft
                JOIN
            public.titleratings r ON ft.tconst = r.tconst
                JOIN
            public.tmdb t ON ft.tconst = t.imdb_id
        `;

        const result = await pool.query(query, [title, year, category, iswinner]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No films found for this noimination' });
        }

        res.json({ 
            film: result.rows 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while searching for film' });
    }
});

module.exports = router;