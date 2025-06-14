import Qera from '../src';
import { z } from 'zod';

const app = Qera({
  logging: {
    level: 'debug',
    format: 'pretty',
  },
  cors: {
    origin: true,
    credentials: true,
  },
  compression: true,
  bodyLimit: '5mb',
  jwt: {
    secret: 'your-secret-key',
    expiresIn: '1h'
  },
  session: {
    secret: 'session-secret',
    cookie: {
      maxAge: 86400000, // 1 day
      httpOnly: true
    }
  },
  rateLimit: {
    max: 100,
    windowMs: 60000, // 1 minute
  },
  staticFiles: {
    root: './public',
    prefix: '/static',
    cacheControl: 'public, max-age=31536000'
  },
  encryption: {
    secret: 'encryption-secret',
    algorithm: 'aes-256-cbc'
  }
});

const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

app.use(async (ctx, next) => {
  console.log(`Request received: ${ctx.req.getMethod()} ${ctx.req.getUrl()}`);
  await next();
  console.log(`Response sent with status: ${ctx.statusCode}`);
});

app.get('/', (ctx) => {
  ctx.json({ message: 'Welcome to Qera framework!' });
});

// Route with parameters
app.get('/users/:id', (ctx) => {
  const { id } = ctx.params;
  ctx.json({ message: `User details for ID: ${id}` });
});

app.get('/search', (ctx) => {
  const { query } = ctx.query;
  ctx.json({ message: `Search results for: ${query}` });
});

// Route with validation
app.post('/login', (ctx) => {
  try {
    // Validate request body
    const data = ctx.validate(loginSchema);
    
    // Generate JWT token
    const token = ctx.signJwt({ username: data.username });
    
    // Set cookie
    ctx.cookie('auth', token, {
      httpOnly: true,
      maxAge: 3600000 // 1 hour
    });
    
    ctx.json({ 
      message: 'Login successful',
      token
    });
  } catch (error) {
    // Validation error already handled by ctx.validate
    console.error('Login error:', error);
  }
});

// Protected route with JWT authentication
app.get('/profile', (ctx) => {
  try {
    // Get token from request header
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ctx.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify token
    const token = authHeader.substring(7);
    const user = ctx.verifyJwt(token);
    
    ctx.json({
      message: 'Profile data',
      user
    });
  } catch (error) {
    ctx.status(401).json({ error: 'Invalid or expired token' });
  }
});

// WebSocket support
app.ws('/chat', {
  open: (ctx) => {
    console.log('WebSocket connection opened');
    ctx.subscribe('global');
    ctx.send(JSON.stringify({ event: 'welcome', message: 'Welcome to the chat!' }));
  },
  message: (ctx, message) => {
    const data = JSON.parse(Buffer.from(message).toString());
    console.log('Message received:', data);
    
    // Broadcast message to all subscribers of 'global' topic
    ctx.publish('global', JSON.stringify({
      event: 'message',
      username: data.username || 'Anonymous',
      text: data.text
    }));
  },
  close: (ctx) => {
    console.log('WebSocket connection closed');
    ctx.unsubscribe('global');
  }
});

// Start the server
app.listen(8080, 'localhost');
