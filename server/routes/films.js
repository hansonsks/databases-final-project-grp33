const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

//complex query, orders by roi
router.get('/highest-roi', async (req, res) => {
    try {
        const { yearStart = 2000, yearEnd = 2023, limit = 10 } = req.query;
        const query = `
            WITH film_financials AS (
                SELECT 
                    m.imdb_id as tconst,
                    m.budget,
                    m.revenue,
                    CASE 
                        WHEN m.budget > 0 THEN ((m.revenue::float / m.budget) - 1) * 100
                        ELSE NULL
                    END AS roi
                FROM 
                    public.tmdb m
                WHERE 
                    m.budget > 1000000
                    AND m.revenue > 0
            ),
            film_details AS (
                SELECT 
                    b.tconst,
                    b.primarytitle,
                    b.startyear,
                    r.averagerating,
                    r.numvotes,
                    ff.budget,
                    ff.revenue,
                    ff.roi
                FROM 
                    public.titlebasics b
                JOIN 
                    film_financials ff ON b.tconst = ff.tconst
                LEFT JOIN 
                    public.titleratings r ON b.tconst = r.tconst
                WHERE r.numvotes > 10000
            ),
            yearly_top_roi AS (
                SELECT 
                    startyear,
                    tconst,
                    primarytitle,
                    averagerating,
                    budget,
                    revenue,
                    roi,
                    RANK() OVER (PARTITION BY startyear ORDER BY roi DESC) AS roi_rank
                FROM 
                    film_details
            )
            SELECT 
                yt.tconst,
                yt.startyear AS year,
                yt.primarytitle AS film_title,
                yt.averagerating AS imdb_rating,
                yt.budget,
                yt.revenue,
                ROUND(yt.roi::numeric, 2) AS return_on_investment,
                EXISTS (
                    SELECT 1
                    FROM public.theoscaraward o
                    WHERE o.filmid = yt.tconst
                    AND o.iswinner = TRUE
                ) AS won_oscar,
                (
                    SELECT string_agg(n.primaryname, ', ')
                    FROM public.titleprincipals p
                    JOIN public.namebasics n ON p.nconst = n.nconst
                    WHERE p.tconst = yt.tconst
                    AND p.category = 'director'
                ) AS director
            FROM 
                yearly_top_roi yt
            WHERE 
                roi_rank = 1
                AND yt.startyear BETWEEN $1 AND $2
            ORDER BY 
                yt.roi DESC
            LIMIT $3
        `;

        const result = await pool.query(query, [yearStart, yearEnd, limit]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No films found' });
        }
        res.json({ films: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching films with highest ROI' });
    }
});

//all the movies a certain actor has been in
router.get('/by-actor/:actorName', async (req, res) => {
    try {
      const { actorName } = req.params;
      const { sortBy = 'year', order = 'desc', limit } = req.query;
      
      console.log(`Searching for films with actor: ${actorName}, limit: ${limit}, sortBy: ${sortBy}, order: ${order}`);
      
      // Set a default value if limit is not provided
      let queryLimit = 10; // Default limit
      
      // Parse the limit parameter
      if (limit !== undefined) {
        if (limit === 'unlimited') {
          // Set to a very large number instead of removing the LIMIT clause
          queryLimit = 100000;
        } else {
          const parsedLimit = parseInt(limit);
          if (!isNaN(parsedLimit) && parsedLimit > 0) {
            queryLimit = parsedLimit;
          }
        }
      }
      
      // Validate sorting parameters
      const validSortFields = ['year', 'title'];
      const validOrders = ['asc', 'desc'];
      
      const sortField = validSortFields.includes(sortBy.toLowerCase()) 
          ? sortBy.toLowerCase() 
          : 'year';
          
      const sortOrder = validOrders.includes(order.toLowerCase())
          ? order.toLowerCase()
          : 'desc';
      
      // First check if the actor exists
      const actorQuery = `
        SELECT nconst 
        FROM public.namebasics 
        WHERE LOWER(primaryname) = LOWER($1)
      `;
      
      const actorResult = await pool.query(actorQuery, [actorName]);
      
      if (actorResult.rows.length === 0) {
        // Return empty results rather than 404 error
        return res.json({ 
          actor: actorName, 
          actorFound: false,
          message: `No actor found with name: ${actorName}`,
          films: [] 
        });
      }
      
      const actorNconst = actorResult.rows[0].nconst;
      
      // Now get the films for this actor
      const filmsQuery = `
        SELECT 
          t.tconst,
          t.primarytitle AS title,
          t.startyear AS year,
          r.averagerating,
          m.revenue
        FROM 
          public.titleprincipals tp
        JOIN 
          public.titlebasics t ON tp.tconst = t.tconst
        LEFT JOIN 
          public.titleratings r ON t.tconst = r.tconst
        LEFT JOIN 
          public.tmdb m ON t.tconst = m.imdb_id
        WHERE 
          tp.nconst = $1
          AND tp.category IN ('actor', 'actress')
        ${sortField === 'year' 
          ? `ORDER BY t.startyear ${sortOrder === 'asc' ? 'ASC' : 'DESC'} NULLS LAST` 
          : `ORDER BY t.primarytitle ${sortOrder === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`}
        LIMIT $2
      `;
      
      const filmsResult = await pool.query(filmsQuery, [actorNconst, queryLimit]);
      
      // Return success even with empty films array
      res.json({ 
        actor: actorName,
        actorFound: true, 
        sortBy: sortField,
        order: sortOrder,
        count: filmsResult.rows.length,
        films: filmsResult.rows 
      });
    } catch (err) {
      console.error('Error fetching films by actor:', err);
      res.status(500).json({ error: 'An error occurred while fetching films by actor' });
    }
  });

  
//top movies by genre
router.get('/top-by-genre/:genreName', async (req, res) => {
    try {
        const { genreName } = req.params;
        const { limit = 10 } = req.query;
        const query = `
            WITH GenreMovies AS (
                SELECT tconst, primarytitle
                FROM public.titlebasics
                WHERE $1 = ANY(genres)
            )
            SELECT 
                gm.tconst,
                gm.primarytitle AS title,
                tb.startyear AS year,
                r.averagerating,
                m.revenue
            FROM 
                GenreMovies gm
            JOIN 
                public.titlebasics tb ON gm.tconst = tb.tconst
            LEFT JOIN 
                public.tmdb m ON gm.tconst = m.imdb_id
            LEFT JOIN 
                public.titleratings r ON gm.tconst = r.tconst
            WHERE 
                m.revenue IS NOT NULL
            ORDER BY 
                m.revenue DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [genreName, limit]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: `No films found for genre: ${genreName}` });
        }
        res.json({ genre: genreName, films: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching top movies by genre' });
    }
});

router.get('/:filmId', async (req, res) => {
    try {
      const { filmId } = req.params;
      
      // Ensure filmId is properly formatted (remove 'tt' prefix if needed for numeric operations)
      const filmIdForQuery = filmId.toString().replace(/^tt/, '');
      
      console.log(`Fetching film details for ID: ${filmIdForQuery}`);
      
      const query = `
        WITH film_base AS (
          SELECT
            t.tconst,
            t.primarytitle AS title,
            t.startyear AS year,
            t.genres,
            r.averagerating,
            r.numvotes,
            m.budget,
            m.revenue,
            m.popularity
          FROM
            public.titlebasics t
          LEFT JOIN
            public.titleratings r ON t.tconst = r.tconst
          LEFT JOIN
            public.tmdb m ON t.tconst = m.imdb_id
          WHERE
            t.tconst = $1::integer
        ),
        film_awards AS (
          SELECT
            o.category,
            o.year AS award_year,
            o.iswinner,
            unnest(o.nomineeids) AS nominee_id
          FROM
            public.theoscaraward o
          WHERE
            o.filmid = $1
        ),
        film_directors AS (
          SELECT
            n.nconst,
            n.primaryname AS name
          FROM
            public.titleprincipals p
          JOIN
            public.namebasics n ON p.nconst = n.nconst
          WHERE
            p.tconst = $1 AND p.category = 'director'
        ),
        film_cast AS (
          SELECT
            p.nconst,
            n.primaryname AS name,
            p.category AS role
          FROM
            public.titleprincipals p
          JOIN
            public.namebasics n ON p.nconst = n.nconst
          WHERE
            p.tconst = $1 AND p.category IN ('actor', 'actress')
          ORDER BY
            p.ordering
          LIMIT 10
        )
        SELECT
          fb.*,
          (SELECT json_agg(fa.*) FROM film_awards fa) AS awards,
          (SELECT json_agg(fd.*) FROM film_directors fd) AS directors,
          (SELECT json_agg(fc.*) FROM film_cast fc) AS cast
        FROM
          film_base fb
      `;
  
      const result = await pool.query(query, [parseInt(filmIdForQuery, 10)]);
      
      if (result.rows.length === 0) {
        console.log(`No film found with ID: ${filmIdForQuery}`);
        return res.status(404).json({ error: 'Film not found' });
      }
      
      // Process the data to handle null arrays
      const film = result.rows[0];
      console.log(`Found film: ${film.title}, Revenue: ${film.revenue}, Budget: ${film.budget}`);
      
      // Ensure arrays are never null
      film.awards = film.awards || [];
      film.directors = film.directors || [];
      film.cast = film.cast || [];
      
      // Calculate ROI if budget and revenue are available
      if (film.budget && film.budget > 0 && film.revenue) {
        // Correctly calculate ROI percentage
        // ROI = ((Revenue - Budget) / Budget) * 100
        film.roi = parseFloat(((film.revenue / film.budget) - 1) * 100).toFixed(2);
      }
      
      res.json({ film });
    } catch (err) {
      console.error('Error fetching film details:', err);
      res.status(500).json({ error: 'An error occurred while fetching film details' });
    }
  });

module.exports = router;