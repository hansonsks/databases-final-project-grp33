const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const config = require('../config');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../config', () => ({
  auth: {
    jwtSecret: 'test_secret',
    jwtExpiry: '1h'
  }
}));

describe('Authentication Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request/response/next mocks
    req = {
      headers: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
  });
  
  it('should call next() if token is valid', () => {
    // Setup
    req.headers['authorization'] = 'Bearer valid_token';
    
    const decodedToken = { userId: 1, username: 'testuser' };
    jwt.verify.mockReturnValueOnce(decodedToken);
    
    // Execute
    authenticateToken(req, res, next);
    
    // Assert
    expect(jwt.verify).toHaveBeenCalledWith('valid_token', config.auth.jwtSecret);
    expect(req.user).toEqual(decodedToken);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  
  it('should return 401 if no token is provided', () => {
    // Execute
    authenticateToken(req, res, next);
    
    // Assert
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('No token provided')
    }));
  });
  
  it('should return 401 if token format is invalid', () => {
    // Setup
    req.headers['authorization'] = 'InvalidFormat';
    
    // Execute
    authenticateToken(req, res, next);
    
    // Assert
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('No token provided')
    }));
  });
  
  it('should return 401 if token is invalid', () => {
    // Setup
    req.headers['authorization'] = 'Bearer invalid_token';
    
    const error = new Error('Invalid token');
    jwt.verify.mockImplementationOnce(() => {
      throw error;
    });
    
    // Execute
    authenticateToken(req, res, next);
    
    // Assert
    expect(jwt.verify).toHaveBeenCalledWith('invalid_token', config.auth.jwtSecret);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Invalid token'
    }));
  });
  
  it('should handle expired tokens', () => {
    // Setup
    req.headers['authorization'] = 'Bearer expired_token';
    
    const tokenError = new Error('jwt expired');
    tokenError.name = 'TokenExpiredError';
    jwt.verify.mockImplementationOnce(() => {
      throw tokenError;
    });
    
    // Execute
    authenticateToken(req, res, next);
    
    // Assert
    expect(jwt.verify).toHaveBeenCalledWith('expired_token', config.auth.jwtSecret);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Invalid token'
    }));
  });
});