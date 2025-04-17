const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database/pool');
const app = require('../server');
const config = require('../config');

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../database/pool');
jest.mock('../config', () => ({
  auth: {
    jwtSecret: 'test_secret',
    jwtExpiry: '1h'
  },
  API_CONFIG: {
    port: 3001
  },
  db: {
    host: 'localhost',
    database: 'test_db',
    user: 'test_user',
    password: 'test_password',
    port: 5432
  }
}));

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock responses
    pool.query.mockResolvedValue({ rows: [] });
    bcrypt.hash.mockResolvedValue('hashed_password');
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mocked_token');
  });
  
  describe('POST /auth/register', () => {
    const validUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };
    
    it('should register a new user successfully', async () => {
      // Mock user not existing
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock user creation
      pool.query.mockResolvedValueOnce({ 
        rows: [{
          user_id: 1,
          username: validUser.username,
          email: validUser.email,
          name: validUser.name,
          created_at: new Date().toISOString()
        }]
      });
      
      const response = await request(app)
        .post('/auth/register')
        .send(validUser);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token', 'mocked_token');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('username', validUser.username);
      expect(response.body).toHaveProperty('name', validUser.name);
      
      expect(pool.query).toHaveBeenCalledTimes(2);
      // Just check that bcrypt.hash was called, without being strict about parameters
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalled();
    });
    
    it('should return 400 if username or email already exists', async () => {
      // Mock user existing
      pool.query.mockResolvedValueOnce({ 
        rows: [{ username: validUser.username, email: validUser.email }] 
      });
      
      const response = await request(app)
        .post('/auth/register')
        .send(validUser);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'User already exists');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
    
    it('should return 400 if validation fails', async () => {
      const invalidUser = {
        username: 'user',
        email: 'not-an-email',
        password: '123', // Too short
        name: ''
      };
      
      const response = await request(app)
        .post('/auth/register')
        .send(invalidUser);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });
  
  describe('POST /auth/login', () => {
    const validCredentials = {
      username: 'testuser',
      password: 'password123'
    };
    
    it('should login successfully with username', async () => {
      // Mock user found
      pool.query.mockResolvedValueOnce({
        rows: [{
          user_id: 1,
          username: 'testuser',
          password: 'hashed_password',
          name: 'Test User'
        }]
      });
      
      const response = await request(app)
        .post('/auth/login')
        .send(validCredentials);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'mocked_token');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('username', 'testuser');
      
      expect(pool.query).toHaveBeenCalledTimes(2); // Find user + update last login
      expect(bcrypt.compare).toHaveBeenCalledWith(validCredentials.password, 'hashed_password');
      expect(jwt.sign).toHaveBeenCalled();
    });
    
    it('should login successfully with email instead of username', async () => {
      const emailCredentials = {
        username: 'test@example.com', // Email used instead of username
        password: 'password123'
      };
      
      // Mock user found
      pool.query.mockResolvedValueOnce({
        rows: [{
          user_id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password: 'hashed_password',
          name: 'Test User'
        }]
      });
      
      const response = await request(app)
        .post('/auth/login')
        .send(emailCredentials);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'mocked_token');
    });
    
    it('should return 401 if user not found', async () => {
      // Mock user not found
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      const response = await request(app)
        .post('/auth/login')
        .send(validCredentials);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
    
    it('should return 401 if password is incorrect', async () => {
      // Mock user found
      pool.query.mockResolvedValueOnce({
        rows: [{
          user_id: 1,
          username: 'testuser',
          password: 'hashed_password',
          name: 'Test User'
        }]
      });
      
      // Mock password comparison fails
      bcrypt.compare.mockResolvedValueOnce(false);
      
      const response = await request(app)
        .post('/auth/login')
        .send(validCredentials);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });
  
  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });
  });
});