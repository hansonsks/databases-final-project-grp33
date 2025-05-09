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

describe('Actor and Director Detail Routes', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('Actor Details', () => {
      it('should get actor details', async () => {
        const mockActorData = {
          rows: [{
            nconst: 123,
            name: 'Tom Hanks',
            totalawards: 2,
            totalnominations: 6,
            totalboxoffice: 10000000000,
            averagerating: 7.8,
            movies: [
              {
                tconst: 456,
                title: 'Forrest Gump',
                year: 1994,
                averagerating: 8.8,
                revenue: 677387716,
                awards: [
                  { category: 'Best Actor', year: 1995, iswinner: true }
                ]
              }
            ]
          }]
        };
        
        pool.query.mockResolvedValueOnce(mockActorData);
        
        const response = await request(app)
          .get('/api/actors/123');
          
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('actor');
        
        const actor = response.body.actor;
        expect(actor.nconst).toBe(123);
        expect(actor.name).toBe('Tom Hanks');
        expect(actor.totalawards).toBe(2);
        expect(actor.movies).toHaveLength(1);
        expect(actor.movies[0].title).toBe('Forrest Gump');
        expect(actor.movies[0].awards).toHaveLength(1);
      });
      
      it('should handle actor not found', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        
        const response = await request(app)
          .get('/api/actors/999999');
          
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Actor not found');
      });
      
      it('should handle database errors', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database error'));
        
        const response = await request(app)
          .get('/api/actors/123');
          
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'An error occurred while fetching actor details');
      });
    });
  
    describe('Director Details', () => {
      it('should get director details', async () => {
        const mockDirectorData = {
          rows: [{
            nconst: 123,
            name: 'Christopher Nolan',
            totalawards: 1,
            totalnominations: 5,
            totalboxoffice: 5000000000,
            averagerating: 8.2,
            movies: [
              {
                tconst: 456,
                title: 'Inception',
                year: 2010,
                averagerating: 8.8,
                revenue: 825532764,
                awards: [
                  { category: 'Best Director', year: 2011, iswinner: false }
                ]
              }
            ]
          }]
        };
        
        pool.query.mockResolvedValueOnce(mockDirectorData);
        
        const response = await request(app)
          .get('/api/directors/123');
          
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('director');
        
        const director = response.body.director;
        expect(director.nconst).toBe(123);
        expect(director.name).toBe('Christopher Nolan');
        expect(director.totalawards).toBe(1);
        expect(director.movies).toHaveLength(1);
        expect(director.movies[0].title).toBe('Inception');
        expect(director.movies[0].awards).toHaveLength(1);
      });
      
      it('should handle director not found', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        
        const response = await request(app)
          .get('/api/directors/999999');
          
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Director not found');
      });
      
      it('should handle cleaning null values in director data', async () => {
        const mockDirectorData = {
          rows: [{
            nconst: 123,
            name: 'Christopher Nolan',
            totalawards: 0,
            totalnominations: 0,
            totalboxoffice: 0,
            averagerating: null,
            movies: [
              {
                tconst: 456,
                title: 'Inception',
                year: 2010,
                averagerating: null,
                revenue: null,
                awards: [null, { category: 'Best Director', year: 2011, iswinner: false }]
              }
            ]
          }]
        };
        
        pool.query.mockResolvedValueOnce(mockDirectorData);
        
        const response = await request(app)
          .get('/api/directors/123');
          
        expect(response.status).toBe(200);
        
        const director = response.body.director;
        expect(director.movies[0].awards).toHaveLength(1); // Null award should be filtered out
      });
      
      it('should handle database errors', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database error'));
        
        const response = await request(app)
          .get('/api/directors/123');
          
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'An error occurred while fetching director details');
      });
    });
  });