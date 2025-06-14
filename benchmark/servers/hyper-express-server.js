// Hyper Express server for benchmarking
try {
  // Import Hyper Express with error handling
  let HyperExpress;
  try {
    HyperExpress = require('hyper-express');
  } catch (err) {
    console.error('Error loading Hyper Express:', err.message);
    console.error('Make sure Hyper Express is properly installed with: pnpm add -D hyper-express');
    process.exit(1);
  }
  
  console.log('Creating Hyper Express server instance...');
  
  // Create a new server instance
  const app = new HyperExpress.Server({
    fast_abort: true,
    trust_proxy: true,
    max_body_length: 10 * 1024 * 1024, // 10MB max body size for more realistic benchmarking
  });
  
  // Root endpoint - Hello World
  app.get('/', (req, res) => {
    res.json({ message: 'Hello, World!' });
  });
  
  // User endpoint with parameter
  app.get('/users/:id', (req, res) => {
    res.json({ id: req.params.id });
  });
  
  // Echo endpoint
  app.post('/echo', async (req, res) => {
    try {
      // Parse request body as JSON
      const body = await req.json();
      res.json(body);
    } catch (err) {
      console.error('Error parsing JSON in Hyper Express:', err);
      res.status(400).json({ error: 'Invalid JSON', message: err.message });
    }
  });

  // Global error handler
  app.set_error_handler((req, res, error) => {
    console.error('Hyper Express error:', error);
    res.status(500).json({ error: 'Server error' });
  });
  
  console.log('Starting Hyper Express server...');
  
  // Start the server
  app.listen(3005)
    .then(() => {
      console.log('Hyper Express server listening on port 3005');
    })
    .catch((error) => {
      console.error('Failed to start Hyper Express server:', error);
      process.exit(1);
    });
  
  // Handle process termination
  const shutdown = () => {
    console.log('Hyper Express server shutting down');
    app.close().then(() => process.exit(0));
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (err) {
  console.error('Failed to start Hyper Express server:', err);
  process.exit(1);
}
