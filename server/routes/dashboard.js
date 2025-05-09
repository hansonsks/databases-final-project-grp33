const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// Get Oscar dashboard data
router.get('/', async (req, res) => {
  try {
    // Get recent Oscar winning films (2020-2023)
    const recentWinnersQuery = `
      SELECT 
        filmtitle AS title,
        year,
        category,
        iswinner,
        awardid,
        filmid
      FROM 
        public.theoscaraward
      WHERE 
        iswinner = true
        AND year >= 2020 AND year <= 2023
      ORDER BY 
        year DESC, category
    `;
    
    // Get Oscar category counts with separate query for films
    const categoriesQuery = `
      SELECT 
        category,
        COUNT(*) AS award_count
      FROM 
        public.theoscaraward
      GROUP BY 
        category
      ORDER BY 
        award_count DESC
      LIMIT 5
    `;
    
    // Get Oscar stats
    const statsQuery = `
      SELECT 
        COUNT(*) AS total_awards,
        COUNT(DISTINCT filmid) AS total_films,
        COUNT(DISTINCT CASE WHEN iswinner THEN filmid END) AS winning_films,
        MIN(year) AS earliest_year,
        MAX(year) AS latest_year
      FROM 
        public.theoscaraward
    `;
    
    // Get highest-grossing films (for the third column)
    const highestGrossingQuery = `
      SELECT 
        t.tconst,
        t.primarytitle AS title,
        t.startyear AS year,
        r.averagerating,
        m.revenue,
        EXISTS (
          SELECT 1 
          FROM public.theoscaraward oa 
          WHERE oa.filmid = t.tconst AND oa.iswinner = true
        ) AS won_oscar,
        (
          SELECT string_agg(nb.primaryname, ', ')
          FROM public.titleprincipals tp
          JOIN public.namebasics nb ON tp.nconst = nb.nconst
          WHERE tp.tconst = t.tconst AND tp.category = 'director'
          LIMIT 2
        ) AS director
      FROM 
        public.tmdb m
      JOIN 
        public.titlebasics t ON m.imdb_id = t.tconst
      LEFT JOIN 
        public.titleratings r ON t.tconst = r.tconst
      WHERE 
        m.revenue > 0
        AND r.numvotes > 10000
      ORDER BY 
        m.revenue DESC
      LIMIT 15
    `;

    // Execute queries in parallel
    const [recentWinners, categories, stats, highestGrossing] = await Promise.all([
      pool.query(recentWinnersQuery),
      pool.query(categoriesQuery),
      pool.query(statsQuery),
      pool.query(highestGrossingQuery)
    ]);

    // For each category, get films in a separate query
    const categoryFilmsPromises = categories.rows.map(async (category) => {
      const filmsQuery = `
        SELECT 
          filmtitle,
          year,
          iswinner,
          filmid,
          awardid
        FROM 
          public.theoscaraward
        WHERE 
          category = $1
        ORDER BY 
          year DESC, iswinner DESC
        LIMIT 20
      `;
      
      const filmsResult = await pool.query(filmsQuery, [category.category]);
      return {
        ...category,
        films: filmsResult.rows
      };
    });
    
    // Wait for all category films queries to complete
    const categoriesWithFilms = await Promise.all(categoryFilmsPromises);

    // Return combined results
    res.json({
      recentWinners: recentWinners.rows,
      topCategories: categoriesWithFilms,
      stats: stats.rows[0],
      highestGrossing: highestGrossing.rows
    });
  } catch (err) {
    console.error('Error fetching Oscar dashboard data:', err);
    res.status(500).json({ error: 'An error occurred while fetching dashboard data' });
  }
});

module.exports = router;