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
            
            // Mock actor search - return found actor
            pool.query.mockResolvedValueOnce({ rows: [{ nconst: 'nm0000158' }] });
            // Mock films search - return mock films data
            pool.query.mockResolvedValueOnce({ rows: mockData });
          
            const response = await request(app)
              .get('/api/films/by-actor/Tom Hanks');
          
            expect(response.status).toBe(200);
            // Updated expectation to match current response format
            expect(response.body).toEqual({
              actor: 'Tom Hanks',
              actorFound: true,
              sortBy: 'year',
              order: 'desc',
              count: mockData.length,
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
            // Actor exists but has no films
            pool.query.mockResolvedValueOnce({ rows: [{ nconst: 'nm9999999' }] });
            pool.query.mockResolvedValueOnce({ rows: [] }); // No films found
          
            const response = await request(app)
              .get('/api/films/by-actor/Unknown Actor');
          
            // API now returns 200 with empty films array instead of 404
            expect(response.status).toBe(200);
            expect(response.body).toEqual({
              actor: 'Unknown Actor',
              actorFound: true,
              sortBy: 'year',
              order: 'desc',
              count: 0,
              films: []
            });
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
            // Updated expectation to include metadata fields
            expect(response.body).toEqual({
              directors: mockData,
              limit: 2,
              sortBy: 'ratings',
              order: 'desc'
            });
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
            // Updated expectation to include metadata fields
            expect(response.body).toEqual({
              decades: mockData,
              decade: "2000",
              limit: 1,
              order: 'desc'
            });
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
        // Updated expectation to include metadata fields
        expect(response.body).toEqual({
            actors: mockData,
            limit: 2,
            sortBy: 'ratings',
            order: 'desc'
        });
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
        // Updated expectation to include metadata fields
        expect(response.body).toEqual({
            decades: mockData,
            decade: "2000",
            limit: 1,
            order: 'desc'
        });
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

describe('Films Routes Additional Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('GET /api/films/by-actor/:actorName - Additional Cases', () => {
      it('should handle actor not found scenario', async () => {
        // Return empty array for actor search
        pool.query.mockResolvedValueOnce({ rows: [] });
        
        const response = await request(app)
          .get('/api/films/by-actor/NonExistentActor');
        
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          actor: 'NonExistentActor',
          actorFound: false,
          message: expect.stringContaining('No actor found'),
          films: []
        });
      });
      
      it('should accept unlimited parameter for limit', async () => {
        // Mock actor found
        pool.query.mockResolvedValueOnce({ rows: [{ nconst: 'nm0000123' }] });
        // Mock films found
        pool.query.mockResolvedValueOnce({ rows: [
          { tconst: 'tt0111161', title: 'The Shawshank Redemption', year: 1994 }
        ]});
        
        const response = await request(app)
          .get('/api/films/by-actor/Morgan Freeman')
          .query({ limit: 'unlimited' });
        
        expect(response.status).toBe(200);
        expect(pool.query.mock.calls[1][1][1]).toBe(100000); // Should use very large number for unlimited
      });
      
      it('should use valid sort fields only', async () => {
        // Mock actor found
        pool.query.mockResolvedValueOnce({ rows: [{ nconst: 'nm0000123' }] });
        // Mock films found
        pool.query.mockResolvedValueOnce({ rows: [
          { tconst: 'tt0111161', title: 'The Shawshank Redemption', year: 1994 }
        ]});
        
        const response = await request(app)
          .get('/api/films/by-actor/Morgan Freeman')
          .query({ sortBy: 'invalid_field' });
        
        expect(response.status).toBe(200);
        
        // Verify the query included the fallback to default sort field
        const queryCall = pool.query.mock.calls[1][0];
        expect(queryCall).toContain('ORDER BY t.startyear');
      });
      
      it('should use valid sort order only', async () => {
        // Mock actor found
        pool.query.mockResolvedValueOnce({ rows: [{ nconst: 'nm0000123' }] });
        // Mock films found
        pool.query.mockResolvedValueOnce({ rows: [
          { tconst: 'tt0111161', title: 'The Shawshank Redemption', year: 1994 }
        ]});
        
        const response = await request(app)
          .get('/api/films/by-actor/Morgan Freeman')
          .query({ order: 'invalid_order' });
        
        expect(response.status).toBe(200);
        
        // Verify the query included the fallback to default sort order
        const queryCall = pool.query.mock.calls[1][0];
        expect(queryCall).toContain('DESC');
      });
      
      it('should handle sort by title', async () => {
        // Mock actor found
        pool.query.mockResolvedValueOnce({ rows: [{ nconst: 'nm0000123' }] });
        // Mock films found
        pool.query.mockResolvedValueOnce({ rows: [
          { tconst: 'tt0111161', title: 'The Shawshank Redemption', year: 1994 }
        ]});
        
        const response = await request(app)
          .get('/api/films/by-actor/Morgan Freeman')
          .query({ sortBy: 'title', order: 'asc' });
        
        expect(response.status).toBe(200);
        
        // Verify the query included the correct sort field and order
        const queryCall = pool.query.mock.calls[1][0];
        expect(queryCall).toContain('ORDER BY t.primarytitle ASC');
      });
    });
    
    describe('GET /api/films/:filmId - Additional Cases', () => {
      it('should handle tt prefix in film ID', async () => {
        const mockFilmData = {
          rows: [{
            tconst: 123,
            title: 'Test Movie',
            year: 2020,
            genres: ['Action'],
            averagerating: 7.5,
            budget: 1000000,
            revenue: 5000000
          }]
        };
        
        pool.query.mockResolvedValueOnce(mockFilmData);
        
        const response = await request(app)
          .get('/api/films/tt123'); // Using tt prefix
        
        expect(response.status).toBe(200);
        expect(response.body.film.title).toBe('Test Movie');
        
        // Check that the query was called with the numeric ID (without 'tt')
        expect(pool.query.mock.calls[0][1][0]).toBe(123);
      });
      
      it('should calculate ROI when both budget and revenue are available', async () => {
        const mockFilmData = {
          rows: [{
            tconst: 123,
            title: 'Profitable Movie',
            year: 2020,
            genres: ['Action'],
            averagerating: 7.5,
            budget: 1000000,
            revenue: 5000000
          }]
        };
        
        pool.query.mockResolvedValueOnce(mockFilmData);
        
        const response = await request(app)
          .get('/api/films/123');
        
        expect(response.status).toBe(200);
        expect(response.body.film).toHaveProperty('roi');
        expect(parseFloat(response.body.film.roi)).toBeCloseTo(400, 1); // ROI should be 400%
      });
      
      it('should not calculate ROI when budget is zero', async () => {
        const mockFilmData = {
          rows: [{
            tconst: 123,
            title: 'Zero Budget Movie',
            year: 2020,
            genres: ['Indie'],
            averagerating: 7.5,
            budget: 0,
            revenue: 5000000
          }]
        };
        
        pool.query.mockResolvedValueOnce(mockFilmData);
        
        const response = await request(app)
          .get('/api/films/123');
        
        expect(response.status).toBe(200);
        expect(response.body.film).not.toHaveProperty('roi');
      });
    });
  });

  describe('Actors Routes Additional Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('GET /api/actors/top - Additional Cases', () => {
      it('should handle invalid sortBy parameter', async () => {
        const response = await request(app)
          .get('/api/actors/top')
          .query({ sortBy: 'invalid_sort' });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid sortBy parameter');
      });
      
      it('should handle missing numeric limit with default fallback', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { primaryname: 'Actor 1', averagerating: 8.5 }
        ]});
        
        const response = await request(app)
          .get('/api/actors/top')
          .query({ limit: 'not-a-number' });
        
        expect(response.status).toBe(200);
        
        // Check that the default limit of 10 was used
        expect(pool.query.mock.calls[0][1][0]).toBe(10);
      });
      
      it('should use ratings query when sortBy=ratings', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { primaryname: 'Actor 1', averagerating: 8.5 }
        ]});
        
        const response = await request(app)
          .get('/api/actors/top')
          .query({ sortBy: 'ratings' });
        
        expect(response.status).toBe(200);
        
        // Check that the correct query was constructed
        const queryString = pool.query.mock.calls[0][0];
        expect(queryString).toContain('FROM mv_top_actors_ratings');
      });
      
      it('should use nominations query when sortBy=nominations', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { primaryname: 'Actor 1', nominations: 10 }
        ]});
        
        const response = await request(app)
          .get('/api/actors/top')
          .query({ sortBy: 'nominations' });
        
        expect(response.status).toBe(200);
        
        // Check that the correct query was constructed
        const queryString = pool.query.mock.calls[0][0];
        expect(queryString).toContain('FROM mv_top_actors_nominations');
      });
      
      it('should use box office query when sortBy=boxOffice', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { primaryname: 'Actor 1', boxofficetotal: 1000000000, moviecount: 10 }
        ]});
        
        const response = await request(app)
          .get('/api/actors/top')
          .query({ sortBy: 'boxOffice' });
        
        expect(response.status).toBe(200);
        
        // Check that the correct query was constructed
        const queryString = pool.query.mock.calls[0][0];
        expect(queryString).toContain('FROM mv_top_actors_box_office');
      });
    });
    
    describe('GET /api/actors/by-decade - Additional Cases', () => {
      it('should query without decade filter when decade is not provided', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { decade: 2010, actor_name: 'Actor 1', nominated_films: 5, total_films: 10 }
        ]});
        
        const response = await request(app)
          .get('/api/actors/by-decade');
        
        expect(response.status).toBe(200);
        
        // Check that the query was called with only one parameter (limit)
        expect(pool.query.mock.calls[0][1].length).toBe(1);
      });
      
      it('should query with decade filter when decade is provided', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { decade: 1990, actor_name: 'Actor 1', nominated_films: 5, total_films: 10 }
        ]});
        
        const response = await request(app)
          .get('/api/actors/by-decade')
          .query({ decade: 1990 });
        
        expect(response.status).toBe(200);
        
        // Check that the query was called with both limit and decade parameters
        expect(pool.query.mock.calls[0][1].length).toBe(2);
        expect(pool.query.mock.calls[0][1][0]).toBe("1990");
      });
    });
  
    describe('GET /api/actors/decades', () => {
      it('should return list of available decades', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { decade: 1950 },
          { decade: 1960 },
          { decade: 1970 }
        ]});
        
        const response = await request(app)
          .get('/api/actors/decades');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('decades');
        expect(response.body.decades).toEqual([1950, 1960, 1970]);
      });
      
      it('should handle database errors', async () => {
        // Mock database error
        pool.query.mockRejectedValueOnce(new Error('Database error'));
        
        const response = await request(app)
          .get('/api/actors/decades');
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to fetch decades');
      });
    });
  });

  describe('Directors Routes Additional Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('GET /api/directors/top - Additional Cases', () => {
      it('should handle invalid sortBy parameter', async () => {
        const response = await request(app)
          .get('/api/directors/top')
          .query({ sortBy: 'invalid_sort' });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid sortBy parameter');
      });
      
      it('should use correct sortOrder when asc is provided', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { primaryname: 'Director 1', averagerating: 7.0 },
          { primaryname: 'Director 2', averagerating: 8.0 }
        ]});
        
        const response = await request(app)
          .get('/api/directors/top')
          .query({ sortBy: 'ratings', order: 'asc' });
        
        expect(response.status).toBe(200);
        
        // Check that the query used ASC order
        const queryString = pool.query.mock.calls[0][0];
        expect(queryString).toContain('ORDER BY ar.avg_rating asc');
      });
      
      it('should use nominations query for sortBy=nominations', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { primaryname: 'Director 1', nominations: 5 }
        ]});
        
        const response = await request(app)
          .get('/api/directors/top')
          .query({ sortBy: 'nominations' });
        
        expect(response.status).toBe(200);
        
        // Check that the nominations query was used
        const queryString = pool.query.mock.calls[0][0];
        expect(queryString).toContain('FROM   mv_director_nominations n');
      });
      
      it('should use box office query for sortBy=boxOffice', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { primaryname: 'Director 1', boxofficetotal: 1000000000, moviecount: 5 }
        ]});
        
        const response = await request(app)
          .get('/api/directors/top')
          .query({ sortBy: 'boxOffice' });
        
        expect(response.status).toBe(200);
        
        // Check that the box office query was used
        const queryString = pool.query.mock.calls[0][0];
        expect(queryString).toContain('FROM   mv_director_revenue r');
      });
  
      it('should handle invalid sort order with default fallback', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { primaryname: 'Director 1', averagerating: 8.5 }
        ]});
        
        const response = await request(app)
          .get('/api/directors/top')
          .query({ order: 'invalid_order' });
        
        expect(response.status).toBe(200);
        
        // Check that the default 'desc' order was used
        const queryString = pool.query.mock.calls[0][0];
        expect(queryString).toContain('ORDER BY ar.avg_rating desc');
      });
    });
    
    describe('GET /api/directors/by-decade - Additional Cases', () => {
      it('should query with decade filter when decade is provided', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { decade: 1980, director_name: 'Director 1', nominated_films: 3, total_films: 8 }
        ]});
        
        const response = await request(app)
          .get('/api/directors/by-decade')
          .query({ decade: 1980 });
        
        expect(response.status).toBe(200);
        
        // Check that both limit and decade parameters were used
        expect(pool.query.mock.calls[0][1].length).toBe(2);
        expect(pool.query.mock.calls[0][1][1]).toBe("1980");
      });
      
      it('should query without decade filter when decade is not provided', async () => {
        // Mock query response
        pool.query.mockResolvedValueOnce({ rows: [
          { decade: 2000, director_name: 'Director 1', nominated_films: 4, total_films: 12 }
        ]});
        
        const response = await request(app)
          .get('/api/directors/by-decade');
        
        expect(response.status).toBe(200);
        
        // Check that only the limit parameter was used (no decade parameter)
        expect(pool.query.mock.calls[0][1].length).toBe(1);
      });
    });
  
    describe('GET /api/directors/:directorId - Cleanup Logic', () => {
      it('should clean up null values in movie arrays', async () => {
        // Mock response with null entries in movies and awards
        const mockDirectorData = {
          rows: [{
            nconst: 123,
            name: 'Test Director',
            totalawards: 0,
            totalnominations: 0,
            totalboxoffice: 0,
            averagerating: null,
            movies: [
              null, // This should be filtered out
              {
                tconst: 456,
                title: 'Test Movie',
                year: 2020,
                awards: [null, { category: 'Best Picture', year: 2021, iswinner: false }]
              },
              { // This entry has no tconst and should be filtered out
                title: 'Incomplete Movie',
                year: 2019
              }
            ]
          }]
        };
        
        pool.query.mockResolvedValueOnce(mockDirectorData);
        
        const response = await request(app)
          .get('/api/directors/123');
        
        expect(response.status).toBe(200);
        
        // Check that null entries were filtered out from movies array
        expect(response.body.director.movies.length).toBe(1);
        // Check that null entries were filtered out from awards array
        expect(response.body.director.movies[0].awards.length).toBe(1);
      });
    });
  });

  describe('Awards Routes Additional Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('GET /api/awards/search-by-awardid - Edge Cases', () => {
      it('should handle missing awardid parameter', async () => {
        const response = await request(app)
          .get('/api/awards/search-by-awardid');
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'An error occurred while searching for film');
      });
      
      it('should handle invalid awardid parameter', async () => {
        const response = await request(app)
          .get('/api/awards/search-by-awardid')
          .query({ awardid: 'not-a-number' });
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'An error occurred while searching for film');
      });
      
      it('should handle database errors when searching by award ID', async () => {
        // Mock database error
        pool.query.mockRejectedValueOnce(new Error('Database error'));
        
        const response = await request(app)
          .get('/api/awards/search-by-awardid')
          .query({ awardid: 123 });
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'An error occurred while searching for film');
      });
    });
    
    describe('GET /api/awards/search-by-other - Edge Cases', () => {
      it('should handle missing required parameters', async () => {
        const response = await request(app)
          .get('/api/awards/search-by-other')
          .query({ title: 'Inception' }); // Missing year, category, iswinner
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'An error occurred while searching for film');
      });
      
      it('should handle invalid year parameter', async () => {
        const response = await request(app)
          .get('/api/awards/search-by-other')
          .query({ 
            title: 'Inception', 
            year: 'not-a-number',
            category: 'Best Picture',
            iswinner: true
          });
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'An error occurred while searching for film');
      });
      
      it('should handle database errors when searching by other criteria', async () => {
        // Mock database error
        pool.query.mockRejectedValueOnce(new Error('Database error'));
        
        const response = await request(app)
          .get('/api/awards/search-by-other')
          .query({ 
            title: 'Inception', 
            year: 2010,
            category: 'Best Picture',
            iswinner: true
          });
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'An error occurred while searching for film');
      });
    });
    
    describe('GET /api/awards/by-category - Additional Tests', () => {
      it('should handle invalid limit parameter', async () => {
        const response = await request(app)
          .get('/api/awards/by-category')
          .query({ 
            category: 'Best Picture',
            limit: 'not-a-number'
          });
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'An error occurred while fetching category films');
      });
      
      it('should use default limit when not provided', async () => {
        // Mock successful query
        pool.query.mockResolvedValueOnce({ 
          rows: [{ filmtitle: 'Test Film', year: 2020, iswinner: true }]
        });
        
        const response = await request(app)
          .get('/api/awards/by-category')
          .query({ category: 'Best Picture' });
        
        expect(response.status).toBe(200);
        
        // Check that default limit was used
        const queryCall = pool.query.mock.calls[0];
        expect(queryCall[1][1]).toBe(10); // Default limit should be 10
      });
    });
  });