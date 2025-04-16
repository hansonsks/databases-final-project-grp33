const express = require('express');
const router = express.Router();
const pool = require('../database/pool');
const { authenticateToken } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userQuery = await pool.query(
      'SELECT user_id, username, email, name, created_at FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get favorites count
    const favoritesCount = await pool.query(
      `SELECT 
        COUNT(CASE WHEN item_type = 'actor' THEN 1 END) as actors,
        COUNT(CASE WHEN item_type = 'director' THEN 1 END) as directors,
        COUNT(CASE WHEN item_type = 'film' THEN 1 END) as films
      FROM user_favorites
      WHERE user_id = $1`,
      [userId]
    );

    const user = userQuery.rows[0];
    
    res.json({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      name: user.name,
      joinDate: user.created_at,
      favoritesCount: favoritesCount.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email } = req.body;
    
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE user_id = $3 RETURNING user_id, username, email, name',
      [name, email, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      name: user.name,
      updatedAt: new Date()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Favorites management routes
router.post('/favorites/:type', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type } = req.params;
    const { itemId } = req.body;
    
    if (!['actors', 'directors', 'films'].includes(type)) {
      return res.status(400).json({ error: 'Invalid favorite type' });
    }
    
    // Convert plural to singular for database
    const itemType = type.slice(0, -1);
    
    // Check if already favorited
    const existingCheck = await pool.query(
      'SELECT * FROM user_favorites WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
      [userId, itemType, itemId]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: `${itemType} is already in favorites` });
    }
    
    // Add to favorites
    const result = await pool.query(
      'INSERT INTO user_favorites (user_id, item_type, item_id) VALUES ($1, $2, $3) RETURNING favorite_id',
      [userId, itemType, itemId]
    );
    
    res.status(201).json({
      message: `${itemType} added to favorites`,
      favoriteId: result.rows[0].favorite_id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all favorites
router.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type } = req.query;
    
    let query;
    
    if (type) {
      // Convert plural to singular for database
      const itemType = type.slice(0, -1);
      
      query = `
        SELECT uf.favorite_id, uf.item_id, uf.item_type
        FROM user_favorites uf
        WHERE uf.user_id = $1 AND uf.item_type = $2
      `;
      
      const result = await pool.query(query, [userId, itemType]);
      
      // Here you would join with appropriate tables to get names/titles
      // This is a simplified version
      
      res.json({
        [type]: result.rows
      });
    } else {
      // Get all types of favorites
      query = `
        SELECT uf.favorite_id, uf.item_id, uf.item_type
        FROM user_favorites uf
        WHERE uf.user_id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      
      // Group by type
      const actors = result.rows.filter(f => f.item_type === 'actor');
      const directors = result.rows.filter(f => f.item_type === 'director');
      const films = result.rows.filter(f => f.item_type === 'film');
      
      res.json({
        actors,
        directors,
        films
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove favorite
router.delete('/favorites/:favoriteId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { favoriteId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM user_favorites WHERE favorite_id = $1 AND user_id = $2 RETURNING *',
      [favoriteId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    
    res.json({ message: 'Favorite removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;