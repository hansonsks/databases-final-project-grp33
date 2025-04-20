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
        WITH actor_films AS (
          SELECT 
            p.nconst,
            r.averagerating,
            r.numvotes
          FROM public.titleprincipals p
          JOIN public.titleratings r ON p.tconst = r.tconst
          WHERE (p.category = 'actor' OR p.category = 'actress')
          AND r.numvotes > 1000
        ),
        actor_ratings AS (
          SELECT 
            nconst,
            AVG(averagerating) as avg_rating,
            COUNT(*) as film_count
          FROM actor_films
          GROUP BY nconst
          HAVING COUNT(*) >= 3
        )
        SELECT 
          nb.nconst,
          nb.primaryname, 
          ar.avg_rating AS averagerating,
          ar.film_count
        FROM actor_ratings ar
        JOIN public.namebasics nb ON ar.nconst = nb.nconst
        ORDER BY ar.avg_rating DESC
        LIMIT $1
      `;
    } else if (sortBy === 'nominations') {
      query = `
        WITH actor_nominations AS (
          SELECT 
            unnest(o.nomineeids::integer[]) as nconst,
            COUNT(*) as nomination_count
          FROM public.theoscaraward o
          WHERE (o.category LIKE '%Actor%' OR o.category LIKE '%Actress%')
          GROUP BY unnest(o.nomineeids::integer[])
        )
        SELECT 
          nb.nconst,
          nb.primaryname,
          an.nomination_count as nominations
        FROM actor_nominations an
        JOIN public.namebasics nb ON an.nconst::text = nb.nconst::text
        ORDER BY an.nomination_count DESC
        LIMIT $1
      `;
    } else if (sortBy === 'boxOffice') {
      query = `
        WITH actor_movies AS (
          SELECT 
            p.nconst,
            t.tconst,
            m.revenue
          FROM public.titleprincipals p
          JOIN public.titlebasics t ON p.tconst = t.tconst
          JOIN public.tmdb m ON t.tconst = m.imdb_id
          WHERE (p.category = 'actor' OR p.category = 'actress')
          AND m.revenue IS NOT NULL
          AND m.revenue > 0
        ),
        actor_totals AS (
          SELECT 
            nconst,
            SUM(revenue) as total_revenue,
            COUNT(tconst) as movie_count
          FROM actor_movies
          GROUP BY nconst
          HAVING COUNT(tconst) >= 3
        )
        SELECT 
          nb.nconst,
          nb.primaryname,
          at.total_revenue as boxofficetotal,
          at.movie_count as moviecount
        FROM actor_totals at
        JOIN public.namebasics nb ON at.nconst = nb.nconst
        ORDER BY at.total_revenue DESC
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
          COUNT(DISTINCT CASE WHEN oscar_nom.filmid IS NOT NULL THEN af.tconst END) AS nominated_films
        FROM 
          actor_films af
        LEFT JOIN 
          oscar_nominations oscar_nom ON af.tconst = oscar_nom.filmid
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
        nconst,
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
      LIMIT 30
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

// Get list of available decades
router.get('/decades', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT decade
      FROM (
        SELECT (startyear / 10) * 10 AS decade
        FROM public.titlebasics
        WHERE startyear IS NOT NULL
      ) as decades
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
        LEFT JOIN public.theoscaraward o ON t.tconst = o.filmid AND o.nomineeids @> ARRAY[$1::text]
        WHERE p.nconst = $1 AND (p.category = 'actor' OR p.category = 'actress')
        LIMIT 100
      )
      SELECT 
        nb.nconst,
        nb.primaryname as name,
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
              WHERE am2.tconst = am.tconst AND am2.category IS NOT NULL
            )
          )
        ) AS movies
      FROM public.namebasics nb
      LEFT JOIN actor_movies am ON true
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
