
try {
  const fastify = require('fastify')({ 
    logger: false,
    trustProxy: true,
    ignoreTrailingSlash: true
  });

  // Register JSON parser
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (err) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  fastify.get('/', async (request, reply) => {
    return { message: 'Hello, World!' };
  });

  fastify.get('/users/:id', async (request, reply) => {
    return { id: request.params.id };
  });

  fastify.post('/echo', async (request, reply) => {
    return request.body;
  });

  // Error handler
  fastify.setErrorHandler(function (error, request, reply) {
    console.error('Fastify error:', error);
    reply.status(500).send({ error: 'Server error' });
  });

  // Start the server
  const start = async () => {
    try {
      await fastify.listen({ port: 3002, host: '0.0.0.0' });
      console.log('Fastify server listening on port 3002');
      
      // Handle process termination
      process.on('SIGTERM', async () => {
        await fastify.close();
        console.log('Fastify server closed');
        process.exit(0);
      });
      
      process.on('SIGINT', async () => {
        await fastify.close();
        console.log('Fastify server closed');
        process.exit(0);
      });
    } catch (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  };
  
  start();
} catch (err) {
  console.error('Failed to start Fastify server:', err);
  process.exit(1);
}
