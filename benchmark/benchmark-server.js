try {
  const Qera = require('../../dist').default;
  
  // Create a basic app instance
  const app = new Qera({
    port: 3000,
    host: 'localhost',
    logging: {
      level: 'error', // Set to error to minimize logging during benchmarks
    }
  });
  
  // Global error handler middleware
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Qera error:', error);
      ctx.status(500).json({ error: 'Server error' });
    }
  });
  
  // Define a simple JSON response route
  app.get('/', (ctx) => {
    ctx.json({ message: 'Hello, World!' });
  });
  
  // Define a route with parameters
  app.get('/users/:id', (ctx) => {
    const { id } = ctx.params;
    ctx.json({ id });
  });
  
  // Define a simple echo route
  app.post('/echo', (ctx) => {
    ctx.json(ctx.body);
  });
  
  // Start the server
  console.log('Benchmark server listening on http://localhost:3000');
  app.listen(3000, 'localhost');
  
  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('Qera server shutting down');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('Qera server shutting down');
    process.exit(0);
  });
} catch (err) {
  console.error('Failed to start Qera server:', err);
  process.exit(1);
}
