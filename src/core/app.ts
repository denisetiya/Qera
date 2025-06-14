import { App, TemplatedApp, HttpRequest, HttpResponse } from 'uWebSockets.js';
import { RouteHandler, Middleware, QeraContext, QeraConfig, WebSocketHandler } from '../types';
import { parseBody } from '../utils/bodyParser';
import { parseCookies } from '../utils/cookieParser';
import { parseUrl } from '../utils/urlParser';
import { Logger } from '../utils/logger';
import { ZodType } from 'zod';

export class Qera {
  private app: TemplatedApp;
  private middlewares: Middleware[] = [];
  private logger: Logger;
  private config: QeraConfig = {};
  private routes: Map<string, Map<string, RouteHandler>> = new Map();
  private wsHandlers: Map<string, WebSocketHandler> = new Map();

  constructor(config: QeraConfig = {}) {
    this.config = {
      port: 3000,
      host: 'localhost',
      logging: {
        level: 'info',
        format: 'pretty',
        output: 'console',
      },
      compression: true,
      bodyLimit: '1mb',
      ...config
    };

    this.logger = new Logger(this.config.logging);
    
    // Initialize the app with SSL if provided
    if (this.config.ssl) {
      this.app = App({
        key_file_name: this.config.ssl.key_file_name,
        cert_file_name: this.config.ssl.cert_file_name,
      });
    } else {
      this.app = App();
    }

    // Initialize route maps
    ['get', 'post', 'put', 'patch', 'del', 'options', 'head', 'any'].forEach(method => {
      this.routes.set(method, new Map());
    });

    // Set up core middleware
    this.setupCoreMiddleware();
  }

  private setupCoreMiddleware() {
    // Add built-in middleware if enabled in config
    if (this.config.compression) {
      // Add compression middleware
      // Note: uWebSockets.js has built-in compression
    }

    if (this.config.cors) {
      this.use(this.corsMiddleware());
    }

    if (this.config.rateLimit) {
      this.use(this.rateLimitMiddleware());
    }

    // Add static file serving if configured
    if (this.config.staticFiles) {
      this.setupStaticFiles();
    }
  }

  private corsMiddleware(): Middleware {
    const cors = this.config.cors || {};
    return async (ctx, next) => {
      // Handle preflight requests
      if (ctx.req.getMethod() === 'options') {
        const origin = cors.origin === true ? ctx.headers.origin : Array.isArray(cors.origin)
          ? (cors.origin.includes(ctx.headers.origin) ? ctx.headers.origin : cors.origin[0])
          : cors.origin || '*';

        ctx.header('Access-Control-Allow-Origin', origin as string)
           .header('Access-Control-Allow-Methods', cors.methods?.join(', ') || 'GET,HEAD,PUT,PATCH,POST,DELETE')
           .header('Access-Control-Allow-Headers', cors.allowedHeaders?.join(', ') || 'Content-Type, Authorization')
           .header('Access-Control-Max-Age', (cors.maxAge || 86400).toString());
        
        if (cors.credentials) {
          ctx.header('Access-Control-Allow-Credentials', 'true');
        }

        if (cors.exposedHeaders?.length) {
          ctx.header('Access-Control-Expose-Headers', cors.exposedHeaders.join(', '));
        }

        ctx.status(204).send('');
        return;
      }

      // Handle regular requests
      const origin = cors.origin === true ? ctx.headers.origin : Array.isArray(cors.origin)
        ? (cors.origin.includes(ctx.headers.origin) ? ctx.headers.origin : cors.origin[0])
        : cors.origin || '*';

      ctx.header('Access-Control-Allow-Origin', origin as string);

      if (cors.credentials) {
        ctx.header('Access-Control-Allow-Credentials', 'true');
      }

      if (cors.exposedHeaders?.length) {
        ctx.header('Access-Control-Expose-Headers', cors.exposedHeaders.join(', '));
      }

      await next();
    };
  }

  private rateLimitMiddleware(): Middleware {
    const rateLimit = this.config.rateLimit!;
    const windowMs = rateLimit.windowMs || 60000; // Default: 1 minute
    const max = rateLimit.max || 100; // Default: 100 requests per windowMs
    const message = rateLimit.message || 'Too many requests, please try again later.';
    const statusCode = rateLimit.statusCode || 429;
    const keyGenerator = rateLimit.keyGenerator || ((ctx) => ctx.headers['x-forwarded-for'] || 'unknown');
    
    // Simple in-memory store for rate limiting
    const store = new Map<string, { count: number, resetTime: number }>();

    // Cleanup old entries periodically
    const cleanup = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of store.entries()) {
        if (data.resetTime <= now) {
          store.delete(key);
        }
      }
    }, windowMs);

    // Keep the cleanup running
    if (typeof cleanup === 'object' && cleanup.unref) {
      cleanup.unref();
    }

    return async (ctx, next) => {
      const key = keyGenerator(ctx);
      const now = Date.now();

      // Initialize or get existing record
      let record = store.get(key);
      if (!record || record.resetTime <= now) {
        record = { count: 0, resetTime: now + windowMs };
        store.set(key, record);
      }

      // Increment count
      record.count++;

      // Set rate limit headers
      if (rateLimit.headers !== false) {
        ctx.header('X-RateLimit-Limit', max.toString());
        ctx.header('X-RateLimit-Remaining', Math.max(0, max - record.count).toString());
        ctx.header('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());
      }

      // Check if rate limit is exceeded
      if (record.count > max) {
        ctx.status(statusCode).json({ error: message });
        return;
      }

      await next();
    };
  }

  private setupStaticFiles() {
    const { root, prefix = '', cacheControl = 'public, max-age=86400' } = this.config.staticFiles!;
    
    // uWebSockets.js has a different approach to static files
    this.app.get(`${prefix}/*`, (res, req) => {
      const url = req.getUrl();
      const filePath = url.startsWith(prefix) 
        ? url.slice(prefix.length) 
        : url;

      res.writeHeader('Content-Type', this.getMimeType(filePath));
      res.writeHeader('Cache-Control', cacheControl);
      
      res.writeStatus('200 OK');
      res.end();
      
      // In a real implementation, we would use uWS's file streaming APIs
      // or readFile and stream the content to the response
    });
  }

  private getMimeType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      txt: 'text/plain',
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  private createQeraContext(req: HttpRequest, res: HttpResponse): QeraContext {
    const headers: Record<string, string> = {};
    req.forEach((key, value) => {
      headers[key] = value;
    });

    const cookies = parseCookies(headers.cookie || '');
    const { query, params } = parseUrl(req.getUrl(), req.getQuery());
    
    // Store status code for tracking
    let statusCode = 200;
    
    const ctx: QeraContext = {
      req,
      res,
      params,
      query,
      headers,
      cookies,
      body: {},
      state: {},
      
      // Add statusCode getter property
      get statusCode() {
        return statusCode;
      },

      // Response methods
      status: (code) => {
        statusCode = code;
        res.writeStatus(code.toString());
        return ctx;
      },
      header: (key, value) => {
        res.writeHeader(key, value);
        return ctx;
      },
      json: (data) => {
        // Default status code is 200 if not explicitly set
        if (statusCode === 0) {
          statusCode = 200;
          res.writeStatus('200 OK');
        }
        res.writeHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      },
      send: (body) => {
        // Default status code is 200 if not explicitly set
        if (statusCode === 0) {
          statusCode = 200;
          res.writeStatus('200 OK');
        }
        if (typeof body === 'string') {
          res.end(body);
        } else {
          res.end(Buffer.from(body as ArrayBuffer));
        }
      },
      redirect: (url, status = 302) => {
        statusCode = status;
        res.writeStatus(status.toString());
        res.writeHeader('Location', url);
        res.end();
      },
      cookie: (name, value, options = {}) => {
        const cookie = require('cookie');
        const cookieStr = cookie.serialize(name, value, options);
        res.writeHeader('Set-Cookie', cookieStr);
        return ctx;
      },
      clearCookie: (name, options = {}) => {
        return ctx.cookie(name, '', {
          ...options,
          expires: new Date(0),
        });
      },

      // Utility methods
      validate: function<T>(schema: ZodType<T>): T {
        const result = schema.safeParse(this.body);
        if (!result.success) {
          this.status(400).json({
            error: 'Validation error',
            details: result.error.format()
          });
          throw new Error('Validation failed');
        }
        return result.data;
      },
      encrypt: (data) => {
        if (!this.config.encryption?.secret) {
          throw new Error('Encryption secret not configured');
        }
        const crypto = require('crypto');
        const algorithm = this.config.encryption.algorithm || 'aes-256-cbc';
        const key = crypto.scryptSync(this.config.encryption.secret, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
      },
      decrypt: (data) => {
        if (!this.config.encryption?.secret) {
          throw new Error('Encryption secret not configured');
        }
        const crypto = require('crypto');
        const algorithm = this.config.encryption.algorithm || 'aes-256-cbc';
        const key = crypto.scryptSync(this.config.encryption.secret, 'salt', 32);
        const [ivHex, encryptedHex] = data.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      },
      signJwt: (payload, options = {}) => {
        if (!this.config.jwt?.secret) {
          throw new Error('JWT secret not configured');
        }
        const jwt = require('jsonwebtoken');
        const jwtOptions = {
          expiresIn: this.config.jwt.expiresIn || '1h',
          ...options
        };
        return jwt.sign(payload, this.config.jwt.secret, jwtOptions);
      },
      verifyJwt: (token) => {
        if (!this.config.jwt?.secret) {
          throw new Error('JWT secret not configured');
        }
        const jwt = require('jsonwebtoken');
        return jwt.verify(token, this.config.jwt.secret, {
          algorithms: this.config.jwt.algorithms || ['HS256']
        });
      }
    };

    return ctx;
  }

  private async handleRequest(
    req: HttpRequest,
    res: HttpResponse,
    method: string,
    handler: RouteHandler,
    routeParams?: Record<string, string>
  ) {
    const ctx = this.createQeraContext(req, res);
    
    // Inject route params if provided
    if (routeParams) {
      ctx.params = {...ctx.params, ...routeParams};
    }

    try {
      // Parse body if needed for this method
      if (['post', 'put', 'patch'].includes(method)) {
        ctx.body = await parseBody(req, res, this.config.bodyLimit);
      }

      // Create middleware chain including the route handler at the end
      const middlewareChain = [...this.middlewares];
      
      // Execute middleware chain
      let currentMiddlewareIndex = 0;
      
      const next = async () => {
        const middleware = middlewareChain[currentMiddlewareIndex];
        currentMiddlewareIndex++;
        
        if (middleware) {
          await middleware(ctx, next);
        } else {
          // After all middleware, execute the route handler
          await handler(ctx);
        }
      };
      
      await next();
    } catch (error) {
      this.logger.error(`Error handling request: ${error}`);
      
      // Only send response if it hasn't been sent yet
      if (!res.aborted) {
        // Set status code in context too for consistency
        ctx.status(500);
        res.writeHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  }

  // Middleware registration
  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  // HTTP methods
  get(path: string, handler: RouteHandler): this {
    this.routes.get('get')!.set(path, handler);
    return this;
  }

  post(path: string, handler: RouteHandler): this {
    this.routes.get('post')!.set(path, handler);
    return this;
  }

  put(path: string, handler: RouteHandler): this {
    this.routes.get('put')!.set(path, handler);
    return this;
  }

  patch(path: string, handler: RouteHandler): this {
    this.routes.get('patch')!.set(path, handler);
    return this;
  }

  delete(path: string, handler: RouteHandler): this {
    this.routes.get('del')!.set(path, handler);
    return this;
  }

  options(path: string, handler: RouteHandler): this {
    this.routes.get('options')!.set(path, handler);
    return this;
  }

  head(path: string, handler: RouteHandler): this {
    this.routes.get('head')!.set(path, handler);
    return this;
  }

  any(path: string, handler: RouteHandler): this {
    this.routes.get('any')!.set(path, handler);
    return this;
  }

  // WebSocket support
  ws(path: string, handlers: WebSocketHandler): this {
    this.wsHandlers.set(path, handlers);
    return this;
  }

  // Start the server
  listen(port?: number, host?: string): void {
    port = port || this.config.port || 3000;
    host = host || this.config.host || 'localhost';

    // Register all routes
    this.registerRoutes();
    
    // Register all WebSocket handlers
    this.registerWebSocketHandlers();

    this.app.listen(host, port, (listenSocket) => {
      if (listenSocket) {
        this.logger.info(`Server listening on http://${host}:${port}`);
      } else {
        this.logger.error(`Failed to listen on port ${port}`);
      }
    });
  }

  private registerRoutes() {
    // Import the matchRoute function from urlParser
    const { matchRoute } = require('../utils/urlParser');

    // Register GET routes
    for (const [routePath, handler] of this.routes.get('get')!) {
      this.app.get(routePath, (res, req) => {
        // Extract params from URL
        const url = req.getUrl();
        const { match, params } = matchRoute(routePath, url);
        
        // Pass params to handleRequest
        this.handleRequest(req, res, 'get', handler, params);
      });
    }

    // Register POST routes
    for (const [routePath, handler] of this.routes.get('post')!) {
      this.app.post(routePath, (res, req) => {
        // Extract params from URL
        const url = req.getUrl();
        const { match, params } = matchRoute(routePath, url);
        
        this.handleRequest(req, res, 'post', handler, params);
      });
    }

    // Register PUT routes
    for (const [routePath, handler] of this.routes.get('put')!) {
      this.app.put(routePath, (res, req) => {
        // Extract params from URL
        const url = req.getUrl();
        const { match, params } = matchRoute(routePath, url);
        
        this.handleRequest(req, res, 'put', handler, params);
      });
    }

    // Register PATCH routes
    for (const [routePath, handler] of this.routes.get('patch')!) {
      this.app.patch(routePath, (res, req) => {
        // Extract params from URL
        const url = req.getUrl();
        const { match, params } = matchRoute(routePath, url);
        
        this.handleRequest(req, res, 'patch', handler, params);
      });
    }

    // Register DELETE routes
    for (const [routePath, handler] of this.routes.get('del')!) {
      this.app.del(routePath, (res, req) => {
        // Extract params from URL
        const url = req.getUrl();
        const { match, params } = matchRoute(routePath, url);
        
        this.handleRequest(req, res, 'del', handler, params);
      });
    }

    // Register OPTIONS routes
    for (const [routePath, handler] of this.routes.get('options')!) {
      this.app.options(routePath, (res, req) => {
        // Extract params from URL
        const url = req.getUrl();
        const { match, params } = matchRoute(routePath, url);
        
        this.handleRequest(req, res, 'options', handler, params);
      });
    }

    // Register HEAD routes
    for (const [routePath, handler] of this.routes.get('head')!) {
      this.app.head(routePath, (res, req) => {
        // Extract params from URL
        const url = req.getUrl();
        const { match, params } = matchRoute(routePath, url);
        
        this.handleRequest(req, res, 'head', handler, params);
      });
    }

    // Register ANY routes
    for (const [routePath, handler] of this.routes.get('any')!) {
      this.app.any(routePath, (res, req) => {
        // Extract params from URL
        const url = req.getUrl();
        const { match, params } = matchRoute(routePath, url);
        
        this.handleRequest(req, res, req.getMethod().toLowerCase(), handler, params);
      });
    }
  }

  private registerWebSocketHandlers() {
    for (const [path, handler] of this.wsHandlers.entries()) {
      this.app.ws(path, {
        // Compression
        compression: 1,
        // Maximum message size
        maxPayloadLength: 16 * 1024 * 1024,
        // Maximum backpressure
        maxBackpressure: 1024 * 1024,
        // Whether to automatically close on error
        closeOnBackpressureLimit: true,
        
        open: (ws) => {
          const url = new URL(`ws://localhost${path}`);
          const query = Object.fromEntries(url.searchParams);
          
        interface WebSocketContext {
            ws: any;
            params: Record<string, any>;
            query: Record<string, any>;
            send: (message: string | ArrayBuffer | ArrayBufferView) => boolean;
            close: (code?: number, reason?: string) => void;
            subscribe: (topic: string) => void;
            unsubscribe: (topic: string) => void;
            publish: (topic: string, message: string | ArrayBuffer | ArrayBufferView) => void;
            authenticate: (authHandler: (token: string) => Promise<boolean>) => Promise<boolean>;
        }

        const ctx: WebSocketContext = {
            ws,
            params: {},
            query,
            send: (message: string | ArrayBuffer | ArrayBufferView) => {
                if (typeof message === 'string' || message instanceof ArrayBuffer) {
                    return ws.send(message) !== 0;
                } else if (ArrayBuffer.isView(message)) {
                    return ws.send(Buffer.from(message.buffer, message.byteOffset, message.byteLength)) !== 0;
                } else {
                    throw new Error('Unsupported message type for ws.send');
                }
            },
            close: (code?: number, reason?: string) => ws.end(code, reason),
            subscribe: (topic: string) => ws.subscribe(topic),
            unsubscribe: (topic: string) => ws.unsubscribe(topic),
            publish: (topic: string, message: string | ArrayBuffer | ArrayBufferView) => {
                if (typeof message === 'string' || message instanceof ArrayBuffer) {
                    ws.publish(topic, message);
                } else if (ArrayBuffer.isView(message)) {
                    ws.publish(topic, Buffer.from(message.buffer, message.byteOffset, message.byteLength));
                } else {
                    throw new Error('Unsupported message type for ws.publish');
                }
            },
            authenticate: async (authHandler: (token: string) => Promise<boolean>) => {
                const token = query.token || '';
                return await authHandler(token);
            }
        };
          
          if (handler.open) {
            handler.open(ctx);
          }
        },
        
        message: (ws, message, isBinary) => {
          if (!handler.message) return;
          
          const url = new URL(`ws://localhost${path}`);
          const query = Object.fromEntries(url.searchParams);
          
          interface WebSocketContext {
            ws: any;
            params: Record<string, any>;
            query: Record<string, any>;
            send: (message: string | ArrayBuffer | ArrayBufferView) => boolean;
            close: (code?: number, reason?: string) => void;
            subscribe: (topic: string) => void;
            unsubscribe: (topic: string) => void;
            publish: (topic: string, message: string | ArrayBuffer | ArrayBufferView) => void;
            authenticate: (authHandler: (token: string) => Promise<boolean>) => Promise<boolean>;
          }

          const ctx: WebSocketContext = {
            ws,
            params: {},
            query,
            send: (message: string | ArrayBuffer | ArrayBufferView): boolean => {
              if (typeof message === 'string' || message instanceof ArrayBuffer) {
                return ws.send(message) !== 0;
              } else if (ArrayBuffer.isView(message)) {
                return ws.send(Buffer.from(message.buffer, message.byteOffset, message.byteLength)) !== 0;
              } else {
                throw new Error('Unsupported message type for ws.send');
              }
            },
            close: (code?: number, reason?: string): void => ws.end(code, reason),
            subscribe: (topic: string) => ws.subscribe(topic),
            unsubscribe: (topic: string): void => { ws.unsubscribe(topic); },
            publish: (topic: string, message: string | ArrayBuffer | ArrayBufferView): void => {
              if (typeof message === 'string' || message instanceof ArrayBuffer) {
                ws.publish(topic, message);
              } else if (ArrayBuffer.isView(message)) {
                ws.publish(topic, Buffer.from(message.buffer, message.byteOffset, message.byteLength));
              } else {
                throw new Error('Unsupported message type for ws.publish');
              }
            },
            authenticate: async (authHandler: (token: string) => Promise<boolean>): Promise<boolean> => {
              const token = query.token || '';
              return await authHandler(token);
            }
          };
          
          handler.message(ctx, message, isBinary);
        },
        
        close: (ws, code, message) => {
          if (!handler.close) return;
          
          const url = new URL(`ws://localhost${path}`);
          const query = Object.fromEntries(url.searchParams);
          
          interface WebSocketContext {
            ws: any;
            params: Record<string, any>;
            query: Record<string, any>;
            send: (message: string | ArrayBuffer | ArrayBufferView) => boolean;
            close: (code?: number, reason?: string) => void;
            subscribe: (topic: string) => void;
            unsubscribe: (topic: string) => void;
            publish: (topic: string, message: string | ArrayBuffer | ArrayBufferView) => void;
            authenticate: (authHandler: (token: string) => Promise<boolean>) => Promise<boolean>;
          }

          const ctx: WebSocketContext = {
            ws,
            params: {},
            query,
            send: (message: string | ArrayBuffer | ArrayBufferView): boolean => false, // will fail as socket is closing
            close: (code?: number, reason?: string): void => {},
            subscribe: (topic: string): void => {},
            unsubscribe: (topic: string): void => {},
            publish: (topic: string, message: string | ArrayBuffer | ArrayBufferView): void => {},
            authenticate: async (authHandler: (token: string) => Promise<boolean>): Promise<boolean> => false
          };
          
          handler.close(ctx, code, message);
        },
      });
    }
  }
}

// Factory function
export default function createApp(config?: QeraConfig): Qera {
  return new Qera(config);
}
