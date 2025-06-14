import { jwtAuth, errorHandler, HttpError } from '../../src/middlewares';
import { QeraContext } from '../../src/types';

// Helper function to create a mock QeraContext
function createMockContext(overrides: Partial<QeraContext> = {}): QeraContext {
  return {
    req: {} as any,
    res: {} as any,
    headers: {},
    params: {},
    query: {},
    cookies: {},
    body: {},
    state: {},
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    redirect: jest.fn(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    validate: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    signJwt: jest.fn(),
    verifyJwt: jest.fn(),
    ...overrides
  } as unknown as QeraContext;
}

describe('Middlewares', () => {
  describe('JWT Auth Middleware', () => {
    const jwt = require('jsonwebtoken');
    const SECRET = 'test-secret';
    const TOKEN = jwt.sign({ userId: 123, username: 'testuser' }, SECRET);
    
    it('should verify valid token from Authorization header', async () => {
      // Mock the context and next function
      const ctx = createMockContext({
        headers: {
          authorization: `Bearer ${TOKEN}`
        }
      });
      const next = jest.fn();
      
      // Call the middleware
      const middleware = jwtAuth({ secret: SECRET });
      await middleware(ctx, next);
      
      // Expectations
      expect(ctx.user).toBeDefined();
      expect(ctx.user.userId).toBe(123);
      expect(ctx.user.username).toBe('testuser');
      expect(next).toHaveBeenCalled();
      expect(ctx.status).not.toHaveBeenCalled();
      expect(ctx.json).not.toHaveBeenCalled();
    });
    
    it('should reject requests without token', async () => {
      // Mock the context and next function
      const ctx = {
        req: {} as any,
        res: {} as any,
        headers: {},
        params: {},
        query: {},
        cookies: {},
        body: {},
        state: {},
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        redirect: jest.fn(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
        validate: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        signJwt: jest.fn(),
        verifyJwt: jest.fn()
      } as unknown as QeraContext;
      const next = jest.fn();
      
      // Call the middleware
      const middleware = jwtAuth({ secret: SECRET });
      await middleware(ctx, next);
      
      // Expectations
      expect(ctx.user).not.toBeDefined();
      expect(next).not.toHaveBeenCalled();
      expect(ctx.status).toHaveBeenCalledWith(401);
      expect(ctx.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
    
    it('should reject invalid tokens', async () => {
      // Mock the context and next function
      const ctx = {
        req: {} as any,
        res: {} as any,
        headers: {
          authorization: 'Bearer invalid-token'
        },
        params: {},
        query: {},
        cookies: {},
        body: {},
        state: {},
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        redirect: jest.fn(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
        validate: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        signJwt: jest.fn(),
        verifyJwt: jest.fn()
      } as unknown as QeraContext;
      const next = jest.fn();
      
      // Call the middleware
      const middleware = jwtAuth({ secret: SECRET });
      await middleware(ctx, next);
      
      // Expectations
      expect(ctx.user).not.toBeDefined();
      expect(next).not.toHaveBeenCalled();
      expect(ctx.status).toHaveBeenCalledWith(401);
      expect(ctx.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });
  });

  describe('Error Handler Middleware', () => {
    it('should pass through when no error occurs', async () => {
      // Mock context and next function
      const ctx = {
        req: {
          getUrl: () => '/test',
          log: { error: jest.fn() }
        } as any,
        res: {} as any,
        headers: {},
        params: {},
        query: {},
        cookies: {},
        body: {},
        state: {},
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        redirect: jest.fn(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
        validate: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        signJwt: jest.fn(),
        verifyJwt: jest.fn()
      } as unknown as QeraContext;
      const next = jest.fn().mockResolvedValue(undefined);
      
      // Call the middleware
      const middleware = errorHandler({});
      await middleware(ctx, next);
      
      // Expectations
      expect(next).toHaveBeenCalled();
    });
    
    it('should handle HttpError with proper status code', async () => {
      // Mock context and next function
      const ctx = {
        req: {
          getUrl: () => '/test',
          log: {
            error: jest.fn()
          }
        } as any,
        res: {} as any,
        headers: {},
        params: {},
        query: {},
        cookies: {},
        body: {},
        state: {},
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        redirect: jest.fn(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
        validate: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        signJwt: jest.fn(),
        verifyJwt: jest.fn()
      } as unknown as QeraContext;
      const next = jest.fn().mockImplementation(() => {
        throw new HttpError(403, 'Forbidden', { reason: 'test' });
      });
      
      // Call the middleware
      const middleware = errorHandler({ log: true });
      await middleware(ctx, next);
      
      // Expectations
      expect(next).toHaveBeenCalled();
      expect(ctx.status).toHaveBeenCalledWith(403);
      expect(ctx.json).toHaveBeenCalledWith({ 
        error: 'Forbidden'
      });
    });
    
    it('should handle generic errors with 500 status code', async () => {
      // Mock context and next function
      const ctx = {
        req: {
          getUrl: () => '/test',
          log: {
            error: jest.fn()
          }
        } as any,
        res: {} as any,
        headers: {},
        params: {},
        query: {},
        cookies: {},
        body: {},
        state: {},
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        redirect: jest.fn(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
        validate: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        signJwt: jest.fn(),
        verifyJwt: jest.fn()
      } as unknown as QeraContext;
      const next = jest.fn().mockImplementation(() => {
        throw new Error('Something went wrong');
      });
      
      // Call the middleware
      const middleware = errorHandler({ log: true });
      await middleware(ctx, next);
      
      // Expectations
      expect(next).toHaveBeenCalled();
      expect(ctx.status).toHaveBeenCalledWith(500);
      expect(ctx.json).toHaveBeenCalledWith({ 
        error: 'Something went wrong'
      });
    });

    it('should include error details in development mode', async () => {
      // Save original NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Mock context and next function
      const jsonMock = jest.fn();
      const ctx = {
        req: {
          getUrl: () => '/test',
          log: {
            error: jest.fn()
          }
        } as any,
        res: {} as any,
        headers: {},
        params: {},
        query: {},
        cookies: {},
        body: {},
        state: {},
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jsonMock,
        send: jest.fn(),
        redirect: jest.fn(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
        validate: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        signJwt: jest.fn(),
        verifyJwt: jest.fn()
      } as unknown as QeraContext;
      const next = jest.fn().mockImplementation(() => {
        throw new Error('Development error');
      });
      
      // Call the middleware
      const middleware = errorHandler({ log: true, includeErrorDetails: true });
      await middleware(ctx, next);
      
      // Expectations
      expect(jsonMock).toHaveBeenCalled();
      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse).toHaveProperty('error', 'Development error');
      expect(errorResponse).toHaveProperty('stack');
      
      // Restore NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('HttpError', () => {
    it('should create an error with status code and details', () => {
      const error = new HttpError(400, 'Bad Request', { field: 'username' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('HttpError');
      expect(error.message).toBe('Bad Request');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'username' });
    });
  });
});
