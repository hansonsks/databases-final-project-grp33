const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// Get top genres
router.get('/top', async (req, res) => {
    try {
      const { sortBy = 'revenue', startYear, endYear, limit = 10 } = req.query;
  
      const orderClause = sortBy === 'revenue' ? 'total_revenue DESC' : 'total_awards DESC';
  
      const query = `
        WITH genre_stats AS (
          SELECT 
            unnest(t.genres) as genre,
            SUM(m.revenue) as total_revenue,
            COUNT(DISTINCT o.awardid) as total_awards
          FROM 
            public.titlebasics t
            JOIN public.tmdb m ON t.tconst = m.imdb_id
            LEFT JOIN public.theoscaraward o ON t.tconst = o.filmid
          WHERE 
            ${startYear ? 't.startyear >= $1 AND' : ''}
            ${endYear ? 't.startyear <= $2 AND' : ''}
            TRUE
          GROUP BY 
            unnest(t.genres)
        )
        SELECT 
          genre,
          total_revenue,
          total_awards
        FROM 
          genre_stats
        ORDER BY ${orderClause}
        LIMIT $3
      `;
  
      const params = [];
      if (startYear) params.push(startYear);
      if (endYear) params.push(endYear);
      params.push(limit);
  
      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No genres found' });
      }
      res.json({ genres: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An error occurred while fetching top genres' });
    }
  });
  

// Get highest grossing film per genre
router.get('/highest-grossing', async (req, res) => {
    try {
      const { startYear, endYear } = req.query;
  
      const query = `
        WITH ranked_films AS (
          SELECT 
            unnest(t.genres) as genre,
            t.primarytitle as title,
            m.revenue,
            ROW_NUMBER() OVER (PARTITION BY unnest(t.genres) ORDER BY m.revenue DESC) as rank
          FROM 
            public.titlebasics t
            JOIN public.tmdb m ON t.tconst = m.imdb_id
          WHERE 
            t.startyear >= COALESCE($1::INT, t.startyear) AND
            t.startyear <= COALESCE($2::INT, t.startyear)
        )
        SELECT 
          genre,
          title,
          revenue
        FROM 
          ranked_films
        WHERE rank = 1
      `;
  
      const params = [startYear || null, endYear || null];
      const result = await pool.query(query, params);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No films found' });
      }
      res.json({ films: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An error occurred while fetching highest grossing films' });
    }
  });
  

// Get genre details
router.get('/:genre', async (req, res) => {
    try {
        const { genre } = req.params;
        const { sortBy = 'revenue' } = req.query;
        
        const query = `
            WITH genre_movies AS (
                SELECT 
                    t.tconst,
                    t.primarytitle as title,
                    m.revenue,
                    COUNT(DISTINCT o.awardid) as award_count
                FROM 
                    public.titlebasics t
                    JOIN public.tmdb m ON t.tconst = m.imdb_id
                    LEFT JOIN public.theoscaraward o ON t.tconst = o.filmid
                WHERE 
                    $1 = ANY(t.genres)
                GROUP BY 
                    t.tconst, t.primarytitle, m.revenue
            )
            SELECT 
                tconst,
                title,
                revenue,
                award_count
            FROM 
                genre_movies
            ORDER BY 
                ${sortBy === 'revenue' ? 'revenue DESC' : 'award_count DESC'}
        `;

        const result = await pool.query(query, [genre]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Genre not found' });
        }
        res.json({ movies: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while fetching genre details' });
    }
});

module.exports = router; 