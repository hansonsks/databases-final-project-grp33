const express = require('express');
const router = express.Router();
const pool = require('../database/pool');

// Get Oscar dashboard data
router.get('/', async (req, res) => {
  try {
    // Get recent Oscar winning films
    const recentWinnersQuery = `
      SELECT 
        filmtitle AS title,
        year,
        category,
        iswinner
      FROM 
        public.theoscaraward
      WHERE 
        iswinner = true
        AND year >= 2020
      ORDER BY 
        year DESC, category
      LIMIT 6
    `;
    
    // Get Oscar category counts
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

    // Execute queries in parallel
    const [recentWinners, categories, stats] = await Promise.all([
      pool.query(recentWinnersQuery),
      pool.query(categoriesQuery),
      pool.query(statsQuery)
    ]);

    // Return combined results
    res.json({
      recentWinners: recentWinners.rows,
      topCategories: categories.rows,
      stats: stats.rows[0]
    });
  } catch (err) {
    console.error('Error fetching Oscar dashboard data:', err);
    res.status(500).json({ error: 'An error occurred while fetching dashboard data' });
  }
});

module.exports = router;