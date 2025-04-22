const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// Get top actors by rating, nominations, or box office
router.get('/top', async (req, res) => {
  try {
    const { sortBy = 'ratings', limit = 10 } = req.query;
    let query;

    if (sortBy === 'ratings') {
      query = `
        SELECT *
        FROM mv_top_actors_ratings
        LIMIT $1;
      `;
    } if (sortBy === 'nominations') {
      query = `
        SELECT *
        FROM mv_top_actors_nominations
        LIMIT $1;
      `;
      
    } else if (sortBy === 'boxOffice') {
      query = `
        SELECT *
        FROM mv_top_actors_box_office
        LIMIT $1;
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
        nconst,
        actor_name,
        nominated_films,
        total_films,
        nomination_percentage,
        RANK() OVER (PARTITION BY decade ORDER BY nominated_films DESC) AS decade_rank
      FROM mv_actor_decade_awards
      WHERE 1=1
    `;

    const params = [];
    let paramIdx = 1;

    if (decade) {
      query += ` AND decade = $${paramIdx++}`;
      params.push(decade);
    }

    query = `SELECT * FROM (
      ${query}
    ) AS ranked_actors WHERE decade_rank <= $${paramIdx}
    ORDER BY decade, decade_rank`;

    params.push(limit);

    const result = await pool.query(query, params);
    res.json({ decades: result.rows });
  } catch (err) {
    console.error('Error in /by-decade route:', err);
    res.status(500).json({ error: 'An error occurred while fetching actors by decade' });
  }
});

// Get list of available decades
router.get('/decades', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT decade
      FROM mv_actor_decade_awards
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
          t.primarytitle                   AS title,
          t.startyear                      AS year,
          r.averagerating,
          m.revenue,
          o.category,
          o.year                           AS awardyear,
          o.iswinner
        FROM   public.titleprincipals p
        JOIN   public.titlebasics     t ON p.tconst = t.tconst
        LEFT   JOIN public.titleratings r ON t.tconst = r.tconst
        LEFT   JOIN public.tmdb         m ON t.tconst = m.imdb_id
        LEFT   JOIN public.theoscaraward o
              ON  t.tconst = o.filmid
              AND o.nomineeids @> ARRAY[$1::text]
        WHERE  p.nconst = $1::integer
          AND (p.category = 'actor' OR p.category = 'actress')
        LIMIT 100
      )
      SELECT
        nb.nconst,
        nb.primaryname AS name,
        COUNT(DISTINCT CASE WHEN am.iswinner THEN am.tconst END) AS totalawards,
        COUNT(DISTINCT am.tconst) AS totalnominations,
        COALESCE(SUM(am.revenue), 0) AS totalboxoffice,
        AVG(am.averagerating) AS averagerating,
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
              WHERE am2.tconst = am.tconst AND am2.category IS NOT NULL
            )
          )
        ) AS movies
      FROM public.namebasics nb
      LEFT JOIN actor_movies am ON TRUE
      WHERE nb.nconst = $1::integer
      GROUP BY nb.nconst, nb.primaryname;
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
