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

describe('Dashboard Routes', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    it('should get dashboard data', async () => {
      // Mock responses for each query
      const mockRecentWinners = {
        rows: [
          { title: 'CODA', year: 2022, category: 'Best Picture', iswinner: true, awardid: 1, filmid: 123 }
        ]
      };
      
      const mockCategories = {
        rows: [
          { category: 'Best Picture', award_count: 94 }
        ]
      };
      
      const mockStats = {
        rows: [
          {
            total_awards: 3140,
            total_films: 732,
            winning_films: 482,
            earliest_year: 1928,
            latest_year: 2022
          }
        ]
      };
      
      const mockHighestGrossing = {
        rows: [
          {
            tconst: 123,
            title: 'Avatar',
            year: 2009,
            averagerating: 7.8,
            revenue: 2787965087,
            won_oscar: true,
            director: 'James Cameron'
          }
        ]
      };
      
      // Mock category films
      const mockCategoryFilms = {
        rows: [
          {
            filmtitle: 'CODA',
            year: 2022,
            iswinner: true,
            filmid: 123,
            awardid: 456
          }
        ]
      };
      
      // Setup multiple mock returns for sequential queries
      pool.query.mockResolvedValueOnce(mockRecentWinners)  // recentWinnersQuery
           .mockResolvedValueOnce(mockCategories)      // categoriesQuery
           .mockResolvedValueOnce(mockStats)           // statsQuery
           .mockResolvedValueOnce(mockHighestGrossing) // highestGrossingQuery
           .mockResolvedValueOnce(mockCategoryFilms);  // For category films query
      
      const response = await request(app)
        .get('/api/dashboard');
        
      expect(response.status).toBe(200);
      
      // Check for presence of all expected sections
      expect(response.body).toHaveProperty('recentWinners');
      expect(response.body).toHaveProperty('topCategories');
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('highestGrossing');
      
      // Check content of sections
      expect(response.body.recentWinners).toEqual(mockRecentWinners.rows);
      expect(response.body.stats).toEqual(mockStats.rows[0]);
      expect(response.body.highestGrossing).toEqual(mockHighestGrossing.rows);
      
      // Check that topCategories contains the category and its films
      expect(response.body.topCategories).toHaveLength(1);
      expect(response.body.topCategories[0].category).toBe('Best Picture');
      expect(response.body.topCategories[0].award_count).toBe(94);
      expect(response.body.topCategories[0].films).toEqual(mockCategoryFilms.rows);
      
      // Check that all queries were called
      expect(pool.query).toHaveBeenCalledTimes(5);
    });
    
    it('should handle database errors', async () => {
      // Mock database error
      pool.query.mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/dashboard');
        
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'An error occurred while fetching dashboard data');
    });
  });