import { Qera } from '../../src/core/app';
import supertest from 'supertest';
import { Server } from 'http';

describe('Qera Core App', () => {
  let app: Qera;
  let server: Server;
  const PORT = 3456; // Using a different port from default to avoid conflicts

  beforeAll(() => {
    // Create a fresh app instance for each test
    app = new Qera({
      port: PORT,
      host: 'localhost',
    });

    // Create a basic route for testing
    app.get('/test', (ctx) => {
      ctx.json({ message: 'Test route working' });
    });

    app.post('/echo', (ctx) => {
      ctx.json({ received: ctx.body });
    });

    app.get('/params/:id', (ctx) => {
      ctx.json({ id: ctx.params.id });
    });

    app.get('/error', () => {
      throw new Error('Test error');
    });

    // Start the server
    app.listen(PORT, 'localhost');

    // Get the server instance for supertest
    server = app['app']['_socket'];
  });

  afterAll((done) => {
    // Close the server after tests
    if (server && server.close) {
      server.close(done);
    } else {
      done();
    }
  });

  it('should respond to GET requests', async () => {
    const response = await supertest(server)
      .get('/test')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ message: 'Test route working' });
  });

  it('should parse JSON in POST requests', async () => {
    const testData = { name: 'Test User', age: 30 };

    const response = await supertest(server)
      .post('/echo')
      .send(testData)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ received: testData });
  });

  it('should extract route parameters correctly', async () => {
    const response = await supertest(server)
      .get('/params/123')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ id: '123' });
  });

  it('should handle errors', async () => {
    const response = await supertest(server)
      .get('/error')
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});
