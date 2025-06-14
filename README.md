# Qera Framework

A high-performance REST API framework powered by uWebSockets.js with minimal dependencies.

## Features

- **High Performance**: Built on top of uWebSockets.js for maximum performance
- **Minimal Dependencies**: Designed with a minimal dependency footprint
- **TypeScript Support**: First-class TypeScript support with full type definitions
- **Express-like API**: Familiar API design for easy adoption
- **WebSocket Support**: Built-in WebSocket capabilities
- **Middleware System**: Flexible middleware architecture
- **Complete HTTP Features**:
  - Body parsing (JSON, form, multipart)
  - Cookie handling
  - CORS support
  - Compression
  - Rate limiting
  - Static file serving
- **Security Features**:
  - JWT authentication
  - Session management
  - Input validation with Zod
  - Data encryption/decryption
- **WebSocket Support**: Full-featured WebSocket implementation
- **CLI Tools**: Scaffolding for common components (controllers, routes, etc.)
- **Hot Reload**: Development mode with auto-restart

## Installation

```bash
npm install qera
```

## Quick Start

```typescript
import Qera from 'qera';

const app = new Qera();

app.get('/', (ctx) => {
  ctx.json({ message: 'Hello, world!' });
});

app.post('/login', (ctx) => {
  const body = ctx.body;
  ctx.json({ welcome: body.username });
});

app.listen(3000);
```

## CLI Usage

Qera includes a CLI tool to help you scaffold your projects:

```bash
# Install globally to use the CLI from anywhere
npm install -g qera

# Initialize a new project
qera init ts  # For TypeScript
qera init js  # For JavaScript

# Generate components
qera generate controller user
qera generate middleware auth
qera generate validator user
qera generate service user
qera generate route user

# Run development server with hot reload
qera serve
```

## Configuration

Qera can be configured with various options:

```typescript
const app = new Qera({
  port: 3000,
  host: 'localhost',
  logging: {
    level: 'info',
    format: 'pretty',
    output: 'console', // or file path
  },
  cors: {
    origin: true, // or specific origins
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
    prefix: '/static'
  },
  encryption: {
    secret: 'encryption-secret'
  }
});
```

## Routing

```typescript
// Basic routes
app.get('/users', usersController.list);
app.post('/users', usersController.create);
app.put('/users/:id', usersController.update);
app.delete('/users/:id', usersController.delete);

// Route with validation
app.post('/register', (ctx) => {
  const schema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8)
  });
  
  const data = ctx.validate(schema);
  // Valid data guaranteed here
  ctx.json({ message: 'User registered', user: data });
});
```

## Middleware

```typescript
// Global middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.req.getMethod()} ${ctx.req.getUrl()} - ${ms}ms`);
});

// Route-specific middleware
app.get('/admin', jwtAuth({ secret: 'your-secret' }), (ctx) => {
  ctx.json({ message: 'Admin area', user: ctx.user });
});
```

## WebSockets

```typescript
app.ws('/chat', {
  open: (ctx) => {
    ctx.subscribe('chatroom');
    ctx.send(JSON.stringify({ event: 'welcome' }));
  },
  
  message: (ctx, message, isBinary) => {
    const data = JSON.parse(Buffer.from(message).toString());
    ctx.publish('chatroom', JSON.stringify({
      user: data.user,
      message: data.message
    }));
  },
  
  close: (ctx) => {
    ctx.unsubscribe('chatroom');
  }
});
```

## Performance

Qera is designed for high performance, leveraging uWebSockets.js to deliver exceptional throughput and low latency.

### Benchmarks

The framework includes built-in benchmark tools to measure performance:

```bash
# Run the Qera benchmark
pnpm benchmark

# Compare Qera with Express, Fastify, and Go implementations
pnpm benchmark:compare

# Use the convenience script (recommended)
./run-benchmark.sh
```

Example benchmark results:

```
Framework    | Requests/sec | Latency (ms) | Throughput (MB/s)
-------------|--------------|--------------|------------------
qera         | 45612        | 2.15         | 8.75             
express      | 28374        | 3.47         | 5.42             
fastify      | 39128        | 2.51         | 7.31             
hyper-express| 47835        | 1.98         | 8.94             
go-http      | 52398        | 1.87         | 9.72             
go-fasthttp  | 68754        | 1.43         | 12.54            
```

See [Benchmarks Documentation](docs/benchmarks.md) for more details.

## Authentication

### JWT Authentication

```typescript
// Create JWT token
app.post('/login', (ctx) => {
  const { username, password } = ctx.body;
  
  // Validate credentials...
  
  const token = ctx.signJwt({ 
    username,
    role: 'user'
  });
  
  ctx.json({ token });
});

// Verify JWT token
app.get('/protected', (ctx) => {
  try {
    const token = ctx.headers.authorization.split(' ')[1];
    const user = ctx.verifyJwt(token);
    
    ctx.json({ message: 'Protected data', user });
  } catch (error) {
    ctx.status(401).json({ error: 'Unauthorized' });
  }
});
```

### Session Authentication

```typescript
// Enable session middleware
app.use(session({
  secret: 'session-secret',
  cookie: {
    maxAge: 86400000, // 1 day
    httpOnly: true
  }
}));

// Set session data
app.post('/login', (ctx) => {
  const { username, password } = ctx.body;
  
  // Validate credentials...
  
  ctx.session.user = { username, role: 'user' };
  ctx.json({ message: 'Logged in' });
});

// Access session data
app.get('/profile', (ctx) => {
  if (!ctx.session.user) {
    return ctx.status(401).json({ error: 'Not logged in' });
  }
  
  ctx.json({ user: ctx.session.user });
});
```

## Data Validation

Qera uses Zod for schema validation:

```typescript
import { z } from 'zod';

app.post('/users', (ctx) => {
  const userSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    age: z.number().min(18).optional()
  });
  
  // Validate data
  const user = ctx.validate(userSchema);
  
  // Data is valid if we get here
  ctx.json({ message: 'User created', user });
});
```

## License

MIT
