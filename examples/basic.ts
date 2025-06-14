import Qera, { Logger } from '../src';
import { v } from '../dist';
import { z } from 'zod';

// Example of directly using Logger
Logger.info('Application starting up');


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

const loginSchema = v.object({
  username: v.string().min(3).max(50),
  password: v.string().min(6),
});

app.use(async (qera, next) => {
  Logger.debug(`Request received: ${qera.req.getMethod()} ${qera.req.getUrl()}`);
  
  // Record start time for request duration
  const startTime = Date.now();
  
  await next();
  
  // Calculate request duration
  const duration = Date.now() - startTime;
  Logger.info(`Response sent with status: ${qera.statusCode}`, { 
    method: qera.req.getMethod(),
    url: qera.req.getUrl(),
    status: qera.statusCode,
    duration: `${duration}ms`
  });
});

app.get('/', (qera) => {
  qera.json({ message: 'Welcome to Qera framework!' });
});

// Route with parameters
app.get('/users/:id', (qera) => {
  const { id } = qera.params;
  qera.json({ message: `User details for ID: ${id}` });
});

app.get('/search', (qera) => {
  const { query } = qera.query;
  qera.json({ message: `Search results for: ${query}` });
});

// Route with validation
app.post('/login', (qera) => {
  try {
    // Validate request body
    const data = qera.validate(loginSchema)
    
    Logger.info(`User logged in: ${data.username}`);
    
    // Generate JWT token
    const token = qera.signJwt({ username: data.username });
    
    // Set cookie
    qera.cookie('auth', token, {
      httpOnly: true,
      maxAge: 3600000 // 1 hour
    });
    
    qera.json({ 
      message: 'Login successful',
      token
    });
  } catch (error) {
    // Validation error already handled by qera.validate
    Logger.error('Login error', { 
      error: error.message,
      username: qera.body?.username 
    });
  }
});

// Protected route with JWT authentication
app.get('/profile', (qera) => {
  try {
    // Get token from request header
    const authHeader = qera.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return qera.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify token
    const token = authHeader.substring(7);
    const user = qera.verifyJwt(token);
    
    qera.json({
      message: 'Profile data',
      user
    });
  } catch (error) {
    qera.status(401).json({ error: 'Invalid or expired token' });
  }
});

// WebSocket support
app.ws('/chat', {
  open: (qera) => {
    Logger.info('WebSocket connection opened');
    qera.subscribe('global');
    qera.send(JSON.stringify({ event: 'welcome', message: 'Welcome to the chat!' }));
  },
  message: (qera, message) => {
    const data = JSON.parse(Buffer.from(message).toString());
    Logger.debug('WebSocket message received', { data });
    
    // Broadcast message to all subscribers of 'global' topic
    qera.publish('global', JSON.stringify({
      event: 'message',
      username: data.username || 'Anonymous',
      text: data.text
    }));
  },
  close: (qera) => {
    Logger.info('WebSocket connection closed');
    qera.unsubscribe('global');
  }
});

// Start the server
const PORT = 8080;
const HOST = 'localhost';
app.listen(PORT, HOST);
Logger.info(`Server started`, { port: PORT, host: HOST });
