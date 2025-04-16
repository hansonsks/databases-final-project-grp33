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

describe('API Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        // Clean up the pool
        await pool.end();
        jest.resetAllMocks();
    });

    describe('Genres Routes', () => {
        it('should get top genres by revenue', async () => {
            const mockData = [
                { genre: 'Action', total_revenue: 5000000000, total_awards: 50 },
                { genre: 'Drama', total_revenue: 4000000000, total_awards: 100 }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockData });

            const response = await request(app)
                .get('/api/genres/top')
                .query({ sortBy: 'revenue', limit: 2 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ genres: mockData });
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
        });

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

        it('should handle genre not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/genres/NonExistentGenre');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Genre not found');
        });
    });

    describe('Films Routes', () => {
        it('should get films with highest ROI', async () => {
            const mockData = [
                {
                    year: 2020,
                    film_title: 'Movie 1',
                    imdb_rating: 8.5,
                    budget: 1000000,
                    revenue: 5000000,
                    return_on_investment: 5.00,
                    won_oscar: true,
                    director: 'Director 1'
                }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockData });

            const response = await request(app)
                .get('/api/films/highest-roi')
                .query({ yearStart: 2000, yearEnd: 2023, limit: 1 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ films: mockData });
        });

        it('should get films by actor', async () => {
            const mockData = [
                {
                    tconst: 'tt0111161',
                    title: 'Movie 1',
                    year: 2020,
                    averagerating: 8.5,
                    revenue: 1000000
                }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockData });

            const response = await request(app)
                .get('/api/films/by-actor/Tom Hanks');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ 
                actor: 'Tom Hanks',
                films: mockData 
            });
        });

        it('should get top movies by genre', async () => {
            const mockData = [
                {
                    tconst: 'tt0111161',
                    title: 'Movie 1',
                    year: 2020,
                    averagerating: 8.5,
                    revenue: 1000000
                }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockData });

            const response = await request(app)
                .get('/api/films/top-by-genre/Action');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ 
                films: mockData,
                genre: 'Action'
            });
        });

        it('should handle no films found for an actor', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/films/by-actor/Unknown Actor');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Actor not found or no films found');
        });

        it('should handle no films found for highest ROI', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/films/highest-roi');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('No films found');
        });
    });

    describe('Directors Routes', () => {
        it('should get top directors by rating', async () => {
            const mockData = [
                { primaryname: 'Director 1', averagerating: 8.5 },
                { primaryname: 'Director 2', averagerating: 8.0 }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockData });

            const response = await request(app)
                .get('/api/directors/top')
                .query({ sortBy: 'ratings', limit: 2 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ directors: mockData });
        });

        it('should get directors by decade', async () => {
            const mockData = [
                {
                    decade: 2000,
                    director_name: 'Director 1',
                    nominated_films: 5,
                    total_films: 10,
                    nomination_percentage: 50.00
                }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockData });

            const response = await request(app)
                .get('/api/directors/by-decade')
                .query({ decade: 2000, limit: 1 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ decades: mockData });
        });

        it('should handle director not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/directors/nm9999999');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Director not found');
        });
    });

    describe('Actors Routes', () => {
        it('should get top actors by rating', async () => {
            const mockData = [
                { primaryname: 'Actor 1', averagerating: 8.5 },
                { primaryname: 'Actor 2', averagerating: 8.0 }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockData });

            const response = await request(app)
                .get('/api/actors/top')
                .query({ sortBy: 'ratings', limit: 2 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ actors: mockData });
        });

        it('should get actors by decade', async () => {
            const mockData = [
                {
                    decade: 2000,
                    actor_name: 'Actor 1',
                    nominated_films: 5,
                    total_films: 10,
                    nomination_percentage: 50.00
                }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockData });

            const response = await request(app)
                .get('/api/actors/by-decade')
                .query({ decade: 2000, limit: 1 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ decades: mockData });
        });

        it('should handle actor not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/actors/nm9999999');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Actor not found');
        });
    });

    describe('Awards Routes', () => {
        it('should get awards by actor', async () => {
            const mockData = [
                {
                    category: 'Best Actor',
                    year: 2001,
                    filmTitle: 'Cast Away',
                    isWinner: false
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

        it('should handle no awards found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/awards/by-actor/Unknown Actor');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Actor not found or no awards found');
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .get('/api/genres/top');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('An error occurred while fetching top genres');
        });
    });
});