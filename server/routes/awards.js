const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// get actor awards
router.get('/by-actor/:actorName', async (req, res) => {
    try {
        const { actorName } = req.params;
        
        const query = `
            WITH TargetNconst AS (
                SELECT nconst
                FROM name.basics
                WHERE (primaryProfession && ARRAY['actor', 'actress'])
                AND primaryName = $1
            )
            SELECT 
                o.category,
                o.year,
                o.filmTitle,
                o.isWinner
            FROM 
                the_oscar_award o,
                TargetNconst tn
            WHERE 
                tn.nconst = ANY(o.nomineeIds)
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

module.exports = router; 