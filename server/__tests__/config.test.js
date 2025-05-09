const mockEnv = {
    DB_HOST: 'test-host',
    DB_NAME: 'test-db',
    DB_USER: 'test-user',
    DB_PASSWORD: 'test-password',
    DB_PORT: '5555',
    API_PORT: '8888',
    JWT_SECRET: 'test-secret',
    JWT_EXPIRY: '48h'
  };
  
  // Mock dotenv
  jest.mock('dotenv', () => ({
    config: jest.fn()
  }));
  
  // Mock process.env before requiring config
  process.env = { ...process.env, ...mockEnv };
  
  describe('Config Module', () => {
    let config;
  
    beforeEach(() => {
      // Clear cache to reload the module with new env vars
      jest.resetModules();
      process.env = { ...process.env, ...mockEnv };
      config = require('../config');
    });
  
    it('should load database configuration from environment variables', () => {
      expect(config.db).toEqual({
        host: 'test-host',
        database: 'test-db',
        user: 'test-user',
        password: 'test-password',
        port: '5555',
        ssl: {
          rejectUnauthorized: false
        }
      });
    });
  
    it('should load API configuration from environment variables', () => {
      expect(config.api.port).toBe('8888');
    });
  
    it('should load auth configuration from environment variables', () => {
      expect(config.auth.jwtSecret).toBe('test-secret');
      expect(config.auth.jwtExpiry).toBe('48h');
    });
  
    it('should use default values if environment variables are missing', () => {
      // Remove env vars to test defaults
      delete process.env.API_PORT;
      delete process.env.JWT_SECRET;
      delete process.env.JWT_EXPIRY;
      
      // Reload config to use defaults
      jest.resetModules();
      config = require('../config');
      
      expect(config.api.port).toBe(8080);
      expect(config.auth.jwtSecret).toBe('AndyEmilyHansonOlivia');
      expect(config.auth.jwtExpiry).toBe('24h');
    });
  });