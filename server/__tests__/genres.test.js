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

describe('Genres Routes', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('GET /api/genres/top', () => {
      it('should get top genres by revenue with default params', async () => {
        const mockData = [
          { genre: 'Action', total_revenue: 5000000000, total_awards: 50 },
          { genre: 'Drama', total_revenue: 4000000000, total_awards: 100 }
        ];
        pool.query.mockResolvedValueOnce({ rows: mockData });
  
        const response = await request(app)
          .get('/api/genres/top');
  
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ genres: mockData });
        expect(pool.query).toHaveBeenCalledTimes(1);
      });
  
      it('should get top genres by awards', async () => {
        const mockData = [
          { genre: 'Drama', total_revenue: 4000000000, total_awards: 100 },
          { genre: 'Action', total_revenue: 5000000000, total_awards: 50 }
        ];
        pool.query.mockResolvedValueOnce({ rows: mockData });
  
        const response = await request(app)
          .get('/api/genres/top')
          .query({ sortBy: 'awards', limit: 2 });
  
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ genres: mockData });
        expect(pool.query).toHaveBeenCalledTimes(1);
      });
  
      it('should get top genres with year filters', async () => {
        const mockData = [
          { genre: 'Comedy', total_revenue: 3000000000, total_awards: 30 }
        ];
        pool.query.mockResolvedValueOnce({ rows: mockData });
  
        const response = await request(app)
          .get('/api/genres/top')
          .query({ 
            sortBy: 'revenue', 
            startYear: 2000, 
            endYear: 2010, 
            limit: 1 
          });
  
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ genres: mockData });
        
        // Verify query params were passed correctly
        const queryCall = pool.query.mock.calls[0];
        expect(queryCall[1]).toContain("2000"); // startYear
        expect(queryCall[1]).toContain("2010"); // endYear
        expect(queryCall[1]).toContain("1");    // limit
      });
  
      it('should handle no genres found', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
  
        const response = await request(app)
          .get('/api/genres/top');
  
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('No genres found');
      });
  
      it('should handle database errors', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database error'));
  
        const response = await request(app)
          .get('/api/genres/top');
  
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('An error occurred while fetching top genres');
      });
    });
  
    describe('GET /api/genres/highest-grossing', () => {
      it('should get highest grossing film per genre', async () => {
        const mockData = [
          { genre: 'Action', title: 'Avengers: Endgame', revenue: 2798000000 },
          { genre: 'Drama', title: 'Titanic', revenue: 2187000000 }
        ];
        pool.query.mockResolvedValueOnce({ rows: mockData });
  
        const response = await request(app)
          .get('/api/genres/highest-grossing');
  
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ films: mockData });
      });
  
      it('should get highest grossing film per genre with year filters', async () => {
        const mockData = [
          { genre: 'Action', title: 'The Dark Knight', revenue: 1000000000 }
        ];
        pool.query.mockResolvedValueOnce({ rows: mockData });
  
        const response = await request(app)
          .get('/api/genres/highest-grossing')
          .query({ startYear: 2000, endYear: 2010 });
  
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ films: mockData });
        
        // Verify query params were passed correctly
        const queryCall = pool.query.mock.calls[0];
        expect(queryCall[1]).toEqual(["2000", "2010"]); // [startYear, endYear]
      });
  
      it('should handle no films found for highest grossing', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
  
        const response = await request(app)
          .get('/api/genres/highest-grossing');
  
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('No films found');
      });
  
      it('should handle database errors', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database error'));
  
        const response = await request(app)
          .get('/api/genres/highest-grossing');
  
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('An error occurred while fetching highest grossing films');
      });
    });
  
    describe('GET /api/genres/:genre', () => {
      it('should get genre details with default sort', async () => {
        const mockData = [
          {
            tconst: 123,
            title: 'The Dark Knight',
            revenue: 1000000000,
            award_count: 2
          }
        ];
        pool.query.mockResolvedValueOnce({ rows: mockData });
  
        const response = await request(app)
          .get('/api/genres/Action');
  
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ movies: mockData });
      });
  
      it('should get genre details sorted by awards', async () => {
        const mockData = [
          {
            tconst: 123,
            title: 'The Dark Knight',
            revenue: 1000000000,
            award_count: 2
          }
        ];
        pool.query.mockResolvedValueOnce({ rows: mockData });
  
        const response = await request(app)
          .get('/api/genres/Action')
          .query({ sortBy: 'awards' });
  
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ movies: mockData });
        
        // Verify the query string includes the proper ORDER BY clause
        const queryCall = pool.query.mock.calls[0][0];
        expect(queryCall).toContain('award_count DESC');
      });
  
      it('should handle genre not found', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
  
        const response = await request(app)
          .get('/api/genres/NonExistentGenre');
  
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Genre not found');
      });
  
      it('should handle database errors', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database error'));
  
        const response = await request(app)
          .get('/api/genres/Action');
  
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('An error occurred while fetching genre details');
      });
    });
  });