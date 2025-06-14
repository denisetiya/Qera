import Qera, { v, Logger } from '../src';

const app = Qera();

// Simple validation test
const userSchema = v.object({
  name: v.string().min(2).max(50),
  email: v.string().email(),
  age: v.number().int().min(18)
});

// Health check
app.get('/health', (qera) => {
  Logger.info('Health check requested');
  return qera.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    validator: 'Qera Custom Validator'
  });
});

// Simple user creation with validation
app.post('/users', async (qera) => {
  try {
    Logger.info('Creating user', { body: qera.body });
    
    // Validate the request body
    const userData = qera.validate(userSchema);
    
    Logger.info('User data validated', userData);
    
    // Create user (mock)
    const user = {
      id: Math.floor(Math.random() * 1000),
      ...userData,
      createdAt: new Date().toISOString()
    };
    
    Logger.info('User created', { userId: user.id });
    
    return qera.status(201).json({
      success: true,
      user
    });
    
  } catch (error: any) {
    Logger.error('Failed to create user', { error: error.message });
    
    if (error.name === 'QeraValidationError') {
      return qera.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.format()
      });
    }
    
    return qera.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Test invalid validation
app.post('/users/invalid', async (qera) => {
  try {
    // Validate with wrong data intentionally
    const userData = qera.validate(userSchema);
    
    return qera.json({
      success: true,
      message: 'This should not happen',
      data: userData
    });
    
  } catch (error: any) {
    Logger.info('Expected validation error caught');
    
    if (error.name === 'QeraValidationError') {
      return qera.status(400).json({
        success: false,
        message: 'Expected validation failed',
        errors: error.format()
      });
    }
    
    return qera.status(500).json({
      success: false,
      message: 'Unexpected error'
    });
  }
});

// Query validation test
const querySchema = v.object({
  page: v.string().transform(val => parseInt(val)).refine(val => val > 0).default(1),
  limit: v.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 100).default(10)
});

app.get('/users', async (qera) => {
  try {
    Logger.info('Getting users', { query: qera.query });
    
    // Validate query parameters
    const { page, limit } = qera.validateQuery(querySchema);
    
    Logger.info('Query validated', { page, limit });
    
    // Mock users
    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com', age: 25 },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 30 }
    ];
    
    return qera.json({
      success: true,
      data: users,
      pagination: { page, limit, total: users.length }
    });
    
  } catch (error: any) {
    Logger.error('Failed to get users', { error: error.message });
    
    if (error.name === 'QeraValidationError') {
      return qera.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.format()
      });
    }
    
    return qera.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Start server
const PORT = 3001;
app.listen(PORT);

Logger.info(`Test API server running on port ${PORT}`);
Logger.info('Test endpoints:');
Logger.info('  GET  /health - Health check');
Logger.info('  POST /users - Create user (requires valid data)');
Logger.info('  POST /users/invalid - Test validation failure');
Logger.info('  GET  /users?page=1&limit=10 - Get users with pagination');
Logger.info('');
Logger.info('Test commands:');
Logger.info('Valid user:');
Logger.info('  curl -X POST http://localhost:3001/users -H "Content-Type: application/json" -d \'{"name":"John Doe","email":"john@example.com","age":25}\'');
Logger.info('');
Logger.info('Invalid user (missing fields):');
Logger.info('  curl -X POST http://localhost:3001/users/invalid -H "Content-Type: application/json" -d \'{"name":"J"}\'');
Logger.info('');
Logger.info('Query validation:');
Logger.info('  curl "http://localhost:3001/users?page=2&limit=5"');
