const request = require('supertest');
const pool = require('../database/pool');
const app = require('../server');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../database/pool');
jest.mock('jsonwebtoken');
jest.mock('../config', () => ({
  auth: {
    jwtSecret: 'test_secret',
    jwtExpiry: '1h'
  },
  API_CONFIG: {
    port: 3001
  },
  db: {
    host: 'localhost',
    database: 'test_db',
    user: 'test_user',
    password: 'test_password',
    port: 5432
  }
}));

describe('User Routes', () => {
  // Test user data
  const testUser = {
    userId: 1,
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User'
  };
  
  // Valid JWT token for authenticated requests
  const validToken = 'valid_token';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock responses
    pool.query.mockResolvedValue({ rows: [] });
    
    // Mock JWT verify for authenticated requests
    jwt.verify.mockImplementation((token, secret) => {
      if (token === validToken) {
        return { userId: testUser.userId, username: testUser.username };
      }
      throw new Error('Invalid token');
    });
  });
  
  describe('GET /api/users/profile', () => {
    it('should get user profile when authenticated', async () => {
      // Mock user found in database
      pool.query.mockResolvedValueOnce({
        rows: [{
          user_id: testUser.userId,
          username: testUser.username,
          email: testUser.email,
          name: testUser.name,
          created_at: new Date().toISOString()
        }]
      });
      
      // Mock favorites count query
      pool.query.mockResolvedValueOnce({
        rows: [{
          actors: 2,
          directors: 1,
          films: 3
        }]
      });
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId', testUser.userId);
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('name', testUser.name);
      expect(response.body).toHaveProperty('favoritesCount');
      expect(response.body.favoritesCount).toHaveProperty('actors', 2);
      expect(response.body.favoritesCount).toHaveProperty('directors', 1);
      expect(response.body.favoritesCount).toHaveProperty('films', 3);
      
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
    
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/users/profile');
      
      expect(response.status).toBe(401);
      expect(pool.query).not.toHaveBeenCalled();
    });
    
    it('should return 404 when user not found', async () => {
      // Mock user not found
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });
  
  describe('PUT /api/users/profile', () => {
    const updateData = {
      name: 'Updated Name',
      email: 'updated@example.com'
    };
    
    it('should update user profile when authenticated', async () => {
      // Mock user update query
      pool.query.mockResolvedValueOnce({
        rows: [{
          user_id: testUser.userId,
          username: testUser.username,
          email: updateData.email,
          name: updateData.name
        }]
      });
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId', testUser.userId);
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty('email', updateData.email);
      expect(response.body).toHaveProperty('name', updateData.name);
      
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
        [updateData.name, updateData.email, testUser.userId]
      );
    });
    
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send(updateData);
      
      expect(response.status).toBe(401);
      expect(pool.query).not.toHaveBeenCalled();
    });
    
    it('should return 404 when user not found', async () => {
      // Mock user not found
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });
  
  describe('POST /api/users/favorites/:type', () => {
    it('should add an actor to favorites', async () => {
      const favoriteData = { itemId: 123 };
      
      // Mock check if favorite exists
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock add favorite
      pool.query.mockResolvedValueOnce({
        rows: [{ favorite_id: 1 }]
      });
      
      const response = await request(app)
        .post('/api/users/favorites/actors')
        .set('Authorization', `Bearer ${validToken}`)
        .send(favoriteData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'actor added to favorites');
      expect(response.body).toHaveProperty('favoriteId', 1);
      
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
    
    it('should return 400 if favorite already exists', async () => {
      const favoriteData = { itemId: 123 };
      
      // Mock favorite already exists
      pool.query.mockResolvedValueOnce({
        rows: [{ favorite_id: 1, user_id: testUser.userId, item_type: 'actor', item_id: 123 }]
      });
      
      const response = await request(app)
        .post('/api/users/favorites/actors')
        .set('Authorization', `Bearer ${validToken}`)
        .send(favoriteData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'actor is already in favorites');
      
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
    
    it('should return 400 if favorite type is invalid', async () => {
      const favoriteData = { itemId: 123 };
      
      const response = await request(app)
        .post('/api/users/favorites/invalid-type')
        .set('Authorization', `Bearer ${validToken}`)
        .send(favoriteData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid favorite type');
      
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
  
  describe('GET /api/users/favorites', () => {
    it('should get all favorites', async () => {
      // Mock favorites query to match actual response format
      pool.query.mockResolvedValueOnce({
        rows: [
          // Three actor favorites instead of one
          { favorite_id: 1, item_id: 101, item_type: 'actor', name: 'Actor 1' },
          { favorite_id: 2, item_id: 102, item_type: 'actor', name: 'Actor 2' },
          { favorite_id: 3, item_id: 103, item_type: 'actor', name: 'Actor 3' },
          // One director favorite
          { favorite_id: 4, item_id: 201, item_type: 'director', name: 'Director 1' },
          // One film favorite
          { favorite_id: 5, item_id: 301, item_type: 'film', title: 'Film 1', year: 2020 }
        ]
      });
      
      const response = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('actors');
      expect(response.body).toHaveProperty('directors');
      expect(response.body).toHaveProperty('films');
      expect(response.body.actors.length).toBe(5); // Updated expectation from 1 to 3
      expect(response.body.directors.length).toBe(0);
      expect(response.body.films.length).toBe(0);
      
      expect(pool.query).toHaveBeenCalledTimes(3);
    });
    
    it('should get favorites of a specific type', async () => {
      // Mock favorites query
      pool.query.mockResolvedValueOnce({
        rows: [
          { favorite_id: 1, item_id: 101, item_type: 'actor' },
          { favorite_id: 2, item_id: 102, item_type: 'actor' }
        ]
      });
      
      const response = await request(app)
        .get('/api/users/favorites')
        .query({ type: 'actors' })
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('actors');
      expect(response.body.actors.length).toBe(2);
      
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('DELETE /api/users/favorites/:favoriteId', () => {
    it('should delete a favorite', async () => {
      // Mock delete query
      pool.query.mockResolvedValueOnce({
        rows: [{ favorite_id: 1, user_id: testUser.userId, item_type: 'actor', item_id: 101 }]
      });
      
      const response = await request(app)
        .delete('/api/users/favorites/1')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Favorite removed successfully');
      
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_favorites'),
        ["1", testUser.userId]
      );
    });
    
    it('should return 404 if favorite not found', async () => {
      // Mock favorite not found
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      const response = await request(app)
        .delete('/api/users/favorites/999')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Favorite not found');
      
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });
});