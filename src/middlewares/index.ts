import { QeraContext, Middleware } from '../types';

// Extend HttpRequest type to include optional 'log' property
declare module 'uWebSockets.js' {
  interface HttpRequest {
    log?: {
      info?: (...args: any[]) => void;
      error?: (...args: any[]) => void;
    };
  }
}

// Authentication middleware using JWT
export function jwtAuth(options: {
  secret: string;
  algorithms?: string[];
  getToken?: (ctx: QeraContext) => string | null;
}): Middleware {
  return async (ctx, next) => {
    try {
      // Get token from the request
      let token: string | null = null;
      
      if (options.getToken) {
        token = options.getToken(ctx);
      } else {
        // Default: check Authorization header or query params
        const authHeader = ctx.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        } else if (ctx.query.token) {
          token = ctx.query.token as string;
        }
      }
      
      if (!token) {
        return ctx.status(401).json({ error: 'Authentication required' });
      }
      
      // Verify token
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, options.secret, {
        algorithms: options.algorithms || ['HS256']
      });
      
      // Set user in context
      ctx.user = payload;
      
      await next();
    } catch (error) {
      ctx.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

// Session middleware
export function session(options: {
  secret: string;
  name?: string;
  cookie?: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  };
}): Middleware {
  // Simple in-memory session store
  const sessions = new Map<string, { data: any, expires: number }>();
  
  // Cleanup expired sessions periodically
  const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
      if (session.expires <= now) {
        sessions.delete(sessionId);
      }
    }
  }, CLEANUP_INTERVAL);
  
  // Keep the cleanup interval running
  if (typeof cleanupInterval === 'object' && cleanupInterval.unref) {
    cleanupInterval.unref();
  }
  
  // Generate session ID
  const generateSessionId = () => {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  };
  
  // Cookie options
  const cookieOptions = {
    maxAge: options.cookie?.maxAge || 24 * 60 * 60 * 1000, // 1 day
    httpOnly: options.cookie?.httpOnly !== false, // true by default
    secure: options.cookie?.secure || false,
    sameSite: options.cookie?.sameSite || 'lax'
  };
  
  // Session cookie name
  const cookieName = options.name || 'qera.sid';
  
  return async (ctx, next) => {
    // Get or create session ID
    let sessionId = ctx.cookies[cookieName];
    let sessionExists = !!sessionId;
    
    // Verify session exists in store
    if (sessionId && !sessions.has(sessionId)) {
      sessionId = '';
      sessionExists = false;
    }
    
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionExists = false;
    }
    
    // Get or create session
    const session = sessions.get(sessionId) || { data: {}, expires: 0 };
    
    // Update session
    const now = Date.now();
    session.expires = now + cookieOptions.maxAge;
    
    // Set session in context
    ctx.session = session.data;
    
    // Continue middleware chain
    await next();
    
    // Save session
    sessions.set(sessionId, session);
    
    // Set/Refresh session cookie
    if (!sessionExists || Object.keys(session.data).length > 0) {
      ctx.cookie(cookieName, sessionId, cookieOptions);
    }
  };
}

// Compression middleware
export function compression(): Middleware {
  // uWebSockets.js has built-in compression, so this is just a placeholder
  return async (ctx, next) => {
    await next();
  };
}

// Logging middleware
export function requestLogger(): Middleware {
  return async (ctx, next) => {
    const startTime = Date.now();
    
    // Generate a unique request ID
    const crypto = require('crypto');
    const requestId = crypto.randomBytes(8).toString('hex');
    
    // Add request ID to context
    ctx.state.requestId = requestId;
    
    // Set request ID header in response
    ctx.header('X-Request-ID', requestId);
    
    try {
      // Log request start
      if (ctx.req.log && typeof ctx.req.log.info === 'function') {
        ctx.req.log.info(`Request started: ${ctx.req.getMethod()} ${ctx.req.getUrl()}`, {
          requestId,
          method: ctx.req.getMethod(),
          url: ctx.req.getUrl(),
          query: ctx.query,
          ip: ctx.headers['x-forwarded-for'] || 'unknown',
          userAgent: ctx.headers['user-agent']
        });
      }
      
      // Continue with request
      await next();
    } catch (error) {
      // Log error if one occurred
      if (ctx.req.log && typeof ctx.req.log.error === 'function') {
        ctx.req.log.error(`Request error: ${ctx.req.getMethod()} ${ctx.req.getUrl()}`, {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      
      // Rethrow to be handled by error middleware
      throw error;
    } finally {
      // Calculate duration
      const duration = Date.now() - startTime;
      
      // Log request completion
      if (ctx.req.log && typeof ctx.req.log.info === 'function') {
        ctx.req.log.info(`Request completed: ${ctx.req.getMethod()} ${ctx.req.getUrl()}`, {
          requestId,
          duration,
          method: ctx.req.getMethod(),
          url: ctx.req.getUrl(),
          status: ctx.res.statusCode
        });
      }
    }
  };
}

// Error handling middleware
export function errorHandler(options: {
  log?: boolean;
  includeErrorDetails?: boolean;
}): Middleware {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      // Default error code
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      
      // Log error if enabled
      if (options.log !== false) {
        if (ctx.req.log && typeof ctx.req.log.error === 'function') {
          ctx.req.log.error('Error in request:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            status: statusCode,
            url: ctx.req.getUrl(),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      }
      
      // Prepare response
      const response: Record<string, any> = {
        error: error instanceof Error ? error.message : 'Internal Server Error'
      };
      
      // Include additional error details if enabled and in development
      if (options.includeErrorDetails && process.env.NODE_ENV !== 'production' && error instanceof Error) {
        response.stack = error.stack;
        response.details = error instanceof HttpError ? error.details : undefined;
      }
      
      ctx.status(statusCode).json(response);
    }
  };
}

// Custom HTTP Error class
export class HttpError extends Error {
  statusCode: number;
  details?: any;
  
  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'HttpError';
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}
