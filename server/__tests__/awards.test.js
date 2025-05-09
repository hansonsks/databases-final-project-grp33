const request = require('supertest');
const app = require('../server');
const pool = require('../database/pool');

// Mock the database pool
jest.mock('../database/pool', () => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn().mockResolvedValue(true)
}));

jest.mock('../config', () => ({
    API_CONFIG: {
        port: 3001  // Using a different port for testing
    },
    db: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
    }
}));

// Set a reasonable timeout
jest.setTimeout(10000);

describe('Awards Routes', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    it('should get awards by actor', async () => {
      const mockData = [
        {
          category: 'Best Actor',
          year: 2001,
          filmtitle: 'Cast Away',
          iswinner: true,
          filmid: 123,
          nomineeids: [789]
        }
      ];
      pool.query.mockResolvedValueOnce({ rows: mockData });
  
      const response = await request(app)
        .get('/api/awards/by-actor/Tom Hanks');
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ 
        actor: 'Tom Hanks',
        awards: mockData 
      });
    });
  
    it('should handle no awards found for actor', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
  
      const response = await request(app)
        .get('/api/awards/by-actor/Unknown Actor');
  
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Actor not found or no awards found');
    });
  
    it('should get awards by category', async () => {
      const mockData = [
        {
          filmtitle: 'The Matrix',
          year: 1999,
          iswinner: true,
          filmid: 123,
          awardid: 456
        }
      ];
      pool.query.mockResolvedValueOnce({ rows: mockData });
  
      const response = await request(app)
        .get('/api/awards/by-category')
        .query({ category: 'Best Visual Effects', limit: 5 });
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        category: 'Best Visual Effects',
        films: mockData
      });
    });
  
    it('should return 400 if category parameter is missing', async () => {
      const response = await request(app)
        .get('/api/awards/by-category');
  
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category parameter is required');
    });
  
    it('should handle no films found for category', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
  
      const response = await request(app)
        .get('/api/awards/by-category')
        .query({ category: 'Non-existent Category' });
  
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No films found for this category');
    });
  
    it('should search films by award ID', async () => {
      const mockData = [
        {
          tconst: 123,
          category: 'Best Picture',
          imdb_rating: 8.5,
          box_office: '50000000',
          directors: 'Christopher Nolan',
          actors: 'Leonardo DiCaprio, Ellen Page'
        }
      ];
      pool.query.mockResolvedValueOnce({ rows: mockData });
  
      const response = await request(app)
        .get('/api/awards/search-by-awardid')
        .query({ awardid: 123 });
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        film: mockData
      });
    });
  
    it('should handle no film found for award ID', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
  
      const response = await request(app)
        .get('/api/awards/search-by-awardid')
        .query({ awardid: 999999 });
  
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No films found for this nomination');
    });
  
    it('should search films by other criteria', async () => {
      const mockData = [
        {
          tconst: 123,
          category: 'Best Picture',
          imdb_rating: 8.5,
          box_office: '50000000',
          directors: 'Christopher Nolan',
          actors: 'Leonardo DiCaprio, Ellen Page'
        }
      ];
      pool.query.mockResolvedValueOnce({ rows: mockData });
  
      const response = await request(app)
        .get('/api/awards/search-by-other')
        .query({ 
          title: 'Inception', 
          year: 2010, 
          category: 'Best Picture', 
          iswinner: true 
        });
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        film: mockData
      });
    });
  
    it('should handle no film found for other criteria', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
  
      const response = await request(app)
        .get('/api/awards/search-by-other')
        .query({ 
          title: 'Non-existent Film', 
          year: 2010, 
          category: 'Best Picture', 
          iswinner: true 
        });
  
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No films found for this noimination');
    });
  
    it('should handle database errors in all routes', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));
  
      const response = await request(app)
        .get('/api/awards/by-actor/Tom Hanks');
  
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('An error occurred while fetching actor awards');
    });
  });