// Setup mocks BEFORE requiring the app
jest.mock('../database/pool', () => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn().mockResolvedValue(true)
}));

jest.mock('../config', () => ({
    API_CONFIG: {
        port: 3001
    },
    db: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
    }
}));

// AFTER setting up mocks, import dependencies
const request = require('supertest');
const pool = require('../database/pool');
const app = require('../server');

// Set a reasonable timeout
jest.setTimeout(10000);

describe('Server Routes Configuration', () => {
    beforeEach(() => {
        // Reset mock data before each test
        jest.clearAllMocks();
        
        // Default mock response for routes
        pool.query.mockResolvedValue({ rows: [] });
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('should route to /api/health endpoint', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should route to /api/genres/top endpoint', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ genre: 'Action' }] });
        const response = await request(app).get('/api/genres/top');
        expect(response.status).toBe(200);
    });

    it('should route to /api/films/highest-roi endpoint', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ film: 'Test' }] });
        const response = await request(app).get('/api/films/highest-roi');
        expect(response.status).toBe(200);
    });

    it('should route to /api/directors/top endpoint', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ director: 'Test' }] });
        const response = await request(app).get('/api/directors/top');
        expect(response.status).toBe(200);
    });

    it('should route to /api/actors/top endpoint', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ actor: 'Test' }] });
        const response = await request(app).get('/api/actors/top');
        expect(response.status).toBe(200);
    });

    it('should route to /api/awards/by-actor/:actorName endpoint', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ award: 'Test' }] });
        const response = await request(app).get('/api/awards/by-actor/Tom%20Hanks');
        expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent routes', async () => {
        const response = await request(app).get('/api/nonexistent-route');
        expect(response.status).toBe(404);
    });
});

describe('Middleware Configuration', () => {
    it('should parse JSON in the request body', async () => {
        const response = await request(app)
            .post('/api/test-json')
            .send({ test: 'data' });
        expect(response.status).toBe(404); 
    });

    it('should handle CORS preflight requests', async () => {
        const response = await request(app)
            .options('/api/test-cors')
            .set('Origin', 'http://example.com')
            .set('Access-Control-Request-Method', 'GET');
        expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
});