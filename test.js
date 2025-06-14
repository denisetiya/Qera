// Simple test for the Qera framework

const Qera = require('./src/core/app').default;

// Create a basic app instance
const app = new Qera();

// Define a simple route
app.get('/', (ctx) => {
  ctx.json({ message: 'Hello from Qera Framework!' });
});

// Define a route that returns posted data
app.post('/echo', (ctx) => {
  ctx.json({ 
    message: 'Echo from server',
    data: ctx.body
  });
});

// Start the server
const PORT = 3000;
console.log(`Starting Qera server on http://localhost:${PORT}`);
app.listen(PORT, 'localhost');