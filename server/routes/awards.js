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

module.exports = router;