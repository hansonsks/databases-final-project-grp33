const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// Get top actors by rating or nominations
router.get('/top', async (req, res) => {
  try {
    const { sortBy = 'ratings', limit = 10 } = req.query;
    let query;

    if (sortBy === 'ratings') {
      query = `
        SELECT 
          nb.nconst,
          nb.primaryname, 
          ar.avg_rating AS averagerating
        FROM actor_avg_ratings ar
        JOIN namebasics nb ON ar.nconst = nb.nconst
        ORDER BY ar.avg_rating DESC
        LIMIT $1
      `;
    } else if (sortBy === 'nominations') {
      query = `
        SELECT 
          anc.nconst,
          nb.primaryname,
          anc.nominations
        FROM actor_nomination_counts anc
        JOIN namebasics nb ON nb.nconst = anc.nconst
        ORDER BY anc.nominations DESC
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

// Get actors with most nominated films by decade
router.get('/by-decade', async (req, res) => {
  try {
    const { decade, limit = 10 } = req.query;
    let query = `
      SELECT 
        decade,
        actor_name,
        nconst,
        nominated_films,
        total_films,
        ROUND((nominated_films::numeric / total_films) * 100, 2) AS nomination_percentage
      FROM top_actors_by_decade_view
      WHERE decade_rank <= $1
    `;

    const params = [limit];

    if (decade && /^\d+$/.test(decade)) {
      query += ` AND decade = $2`;
      params.push(parseInt(decade, 10));
    }

    query += ` ORDER BY decade, decade_rank`;

    const result = await pool.query(query, params);
    res.json({ decades: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while fetching actors by decade' });
  }
});

// Get list of available decades
router.get('/decades', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT decade
      FROM top_actors_by_decade_view
      ORDER BY decade ASC
    `);
    res.json({ decades: result.rows.map(row => row.decade) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch decades' });
  }
});

// Get detailed information about a single actor
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
        FROM public.titleprincipals p
        JOIN public.titlebasics t ON p.tconst = t.tconst
        LEFT JOIN public.titleratings r ON t.tconst = r.tconst
        LEFT JOIN public.tmdb m ON t.tconst = m.imdb_id
        LEFT JOIN theoscaraward o ON t.tconst = o.filmid AND o.nomineeids @> ARRAY[nconst::text]
        WHERE p.nconst = $1 AND (p.category = 'actor' OR p.category = 'actress')
      )
      SELECT 
        nb.nconst,
        nb.primaryname as name,
        COUNT(DISTINCT CASE WHEN am.iswinner THEN am.tconst END) as totalawards,
        COUNT(DISTINCT am.tconst) as totalnominations,
        COALESCE(SUM(am.revenue), 0) as totalboxoffice,
        AVG(am.averagerating) as averagerating,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'tconst', am.tconst,
            'title', am.title,
            'year', am.year,
            'averagerating', am.averagerating,
            'revenue', am.revenue,
            'awards', (
              SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                  'category', am2.category,
                  'year', am2.awardyear,
                  'iswinner', am2.iswinner
                )
              )
              FROM actor_movies am2
              WHERE am2.tconst = am.tconst
            )
          )
        ) AS movies
      FROM public.namebasics nb
      JOIN actor_movies am ON nb.nconst = $1
      WHERE nb.nconst = $1
      GROUP BY nb.nconst, nb.primaryname
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
