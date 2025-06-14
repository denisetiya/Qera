
try {
  const express = require('express');
  const app = express();

  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ message: 'Hello, World!' });
  });

  app.get('/users/:id', (req, res) => {
    res.json({ id: req.params.id });
  });

  app.post('/echo', (req, res) => {
    res.json(req.body);
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ error: 'Server error' });
  });

  const server = app.listen(3001, () => {
    console.log('Express server listening on port 3001');
  });

  // Handle process termination
  process.on('SIGTERM', () => {
    server.close(() => {
      console.log('Express server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    server.close(() => {
      console.log('Express server closed');
      process.exit(0);
    });
  });
} catch (err) {
  console.error('Failed to start Express server:', err);
  process.exit(1);
}
