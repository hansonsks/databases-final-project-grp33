const request = require('supertest');
const express = require('express');
const EventEmitter = require('events');
const cors = require('cors');

// Save original modules to restore after tests
let originalPool;
let originalConfig;

describe('Server and Pool Module Tests', () => {
  beforeAll(() => {
    // Backup originals
    originalPool = jest.requireActual('../database/pool');
    originalConfig = jest.requireActual('../config');
  });

  afterAll(() => {
    // Restore modules
    jest.resetModules();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pool Module', () => {
    it('should handle errors on idle client', () => {
      // Mock console.error and process.exit
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      // Create a mock Pool that extends EventEmitter
      class MockPool extends EventEmitter {
        constructor() {
          super();
        }
        
        // Mock query method
        query = jest.fn().mockResolvedValue({ rows: [] });
        
        // Mock end method
        end = jest.fn().mockResolvedValue(true);
      }
      
      // Mock pg.Pool constructor to return our mock pool
      jest.mock('pg', () => {
        return {
          Pool: jest.fn(() => new MockPool())
        };
      });
      
      // Require the pool module to get our mocked version
      jest.resetModules();
      const pool = require('../database/pool');
      
      // Emit an error on the pool
      const testError = new Error('Test idle client error');
      const testClient = { test: 'client' };
      pool.emit('error', testError, testClient);
      
      // Verify error was logged and process.exit was called
      expect(mockConsoleError).toHaveBeenCalledWith('Unexpected error on idle client', testError);
      expect(mockProcessExit).toHaveBeenCalledWith(-1);
      
      // Restore mocks
      mockConsoleError.mockRestore();
      mockProcessExit.mockRestore();
    });
  });

  describe('Server Error Handling', () => {
    it('should handle errors with middleware', async () => {
      // Create a mock app
      const app = express();
      
      // Add core middleware
      app.use(cors());
      app.use(express.json());
      
      // Add a route that throws an error
      app.get('/test-error', (req, res, next) => {
        const error = new Error('Test error');
        next(error);
      });
      
      // Add the error handling middleware from the server
      app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ error: 'Something went wrong!' });
      });
      
      // Send a request to the error route
      const response = await request(app).get('/test-error');
      
      // Check that the response has the expected error
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Something went wrong!');
    });
    
    it('should handle 404 routes', async () => {
      const app = express();
      app.use(cors());
      app.use(express.json());
      
      // Send a request to a non-existent route
      const response = await request(app).get('/non-existent-route');
      
      // The default Express behavior is to return 404 Not Found
      expect(response.status).toBe(404);
    });
  });

  describe('Server Startup', () => {
    it('should configure the Express app with middleware and mount routers', () => {
      const mockUse = jest.fn();
      const mockGet = jest.fn(); // For app.get, app.post etc. on the main app
      const mockPost = jest.fn();
  
      // Mock for an Express Router instance
      const mockRouterInstance = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        use: jest.fn(),
        // Add any other router methods your route files use
      };
  
      // Mock for express.Router() factory function
      const mockRouterMethod = jest.fn(() => mockRouterInstance);
  
      const mockJsonMiddleware = jest.fn(() => 'json-middleware-mock');
      const mockCorsMiddleware = jest.fn(() => 'cors-middleware-mock');
  
      const mockApp = {
        use: mockUse,
        get: mockGet,
        post: mockPost,
        listen: jest.fn(),
        // Potentially other methods your app uses
      };
  
      // Mock the express module
      const mockExpress = jest.fn(() => mockApp); // This is for when 'express()' is called
      mockExpress.json = mockJsonMiddleware;     // For 'express.json()'
      mockExpress.Router = mockRouterMethod;     // For 'express.Router()'
  
      jest.mock('express', () => mockExpress);
      jest.mock('cors', () => mockCorsMiddleware);
  
      // Require the server module AFTER setting up mocks
      jest.resetModules();
      const serverAppInstance = require('../server'); // This will use your mocked express
  
      // Verify app.use was called for middleware
      expect(mockUse).toHaveBeenCalledWith(mockCorsMiddleware());
      expect(mockUse).toHaveBeenCalledWith(mockJsonMiddleware());
  
      // Verify express.Router() was called (at least once for one of your route files)
      expect(mockExpress.Router).toHaveBeenCalled();
      expect(mockUse).toHaveBeenCalledWith('/api/films', mockRouterInstance);
    });
  });
});