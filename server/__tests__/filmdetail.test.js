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

describe('Film Detail Routes', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    it('should get film details', async () => {
      const mockFilmData = {
        rows: [{
          tconst: 123,
          title: 'Inception',
          year: 2010,
          genres: ['Action', 'Sci-Fi', 'Thriller'],
          averagerating: 8.8,
          numvotes: 2000000,
          budget: 160000000,
          revenue: 825532764,
          popularity: 80.5,
          awards: [
            { category: 'Best Visual Effects', award_year: 2011, iswinner: true }
          ],
          directors: [
            { nconst: 456, name: 'Christopher Nolan' }
          ],
          cast: [
            { nconst: 789, name: 'Leonardo DiCaprio', role: 'actor' }
          ]
        }]
      };
      
      pool.query.mockResolvedValueOnce(mockFilmData);
      
      const response = await request(app)
        .get('/api/films/123');
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('film');
      
      const film = response.body.film;
      expect(film.tconst).toBe(123);
      expect(film.title).toBe('Inception');
      expect(film.year).toBe(2010);
      expect(film.averagerating).toBe(8.8);
      expect(film.revenue).toBe(825532764);
      expect(film.directors).toHaveLength(1);
      expect(film.cast).toHaveLength(1);
      expect(film.awards).toHaveLength(1);
      
      // Check ROI calculation - ROI = ((Revenue / Budget) - 1) * 100
      expect(film).toHaveProperty('roi');
      expect(parseFloat(film.roi)).toBeCloseTo(415.96, 1);
    });
    
    it('should handle film not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      const response = await request(app)
        .get('/api/films/999999');
        
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Film not found');
    });
    
    it('should handle film with missing data', async () => {
      const mockFilmData = {
        rows: [{
          tconst: 123,
          title: 'Indie Film',
          year: 2015,
          genres: ['Drama'],
          averagerating: 7.5,
          numvotes: 5000,
          budget: null,
          revenue: null,
          popularity: 20,
          awards: null,
          directors: [],
          cast: []
        }]
      };
      
      pool.query.mockResolvedValueOnce(mockFilmData);
      
      const response = await request(app)
        .get('/api/films/123');
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('film');
      
      const film = response.body.film;
      expect(film.tconst).toBe(123);
      expect(film.title).toBe('Indie Film');
      expect(film.awards).toEqual([]);
      expect(film.directors).toEqual([]);
      expect(film.cast).toEqual([]);
      expect(film).not.toHaveProperty('roi'); // ROI should not be calculated with null budget
    });
    
    it('should handle database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/films/123');
        
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'An error occurred while fetching film details');
    });
  });