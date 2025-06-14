import Qera, { v, Logger } from '../src';

const app = Qera();

// Schema untuk user registration
const registerSchema = v.object({
  name: v.string().min(2, 'Name must be at least 2 characters').max(100),
  email: v.string().email('Invalid email address'),
  password: v.string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (value) => /[A-Z]/.test(value), 
      'Password must contain at least one uppercase letter'
    )
    .refine(
      (value) => /[a-z]/.test(value),
      'Password must contain at least one lowercase letter'
    )
    .refine(
      (value) => /\d/.test(value),
      'Password must contain at least one number'
    ),
  age: v.number().int().min(13).max(120),
  role: v.enum(['user', 'admin']).default('user'),
  preferences: v.object({
    newsletter: v.boolean().default(false),
    notifications: v.boolean().default(true),
    theme: v.enum(['light', 'dark']).default('light')
  }).optional()
});

// Schema untuk user update
const updateUserSchema = v.object({
  name: v.string().min(2).max(100).optional(),
  email: v.string().email().optional(),
  age: v.number().int().min(13).max(120).optional(),
  preferences: v.object({
    newsletter: v.boolean().optional(),
    notifications: v.boolean().optional(),
    theme: v.enum(['light', 'dark']).optional()
  }).optional()
});

// Schema untuk query parameters
const getUsersQuerySchema = v.object({
  page: v.string().transform(val => parseInt(val)).refine(val => val > 0, 'Page must be positive').default(1),
  limit: v.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100').default(10),
  search: v.string().optional(),
  role: v.enum(['user', 'admin']).optional()
});

// User registration endpoint with validation
app.post('/api/users/register', async (qera) => {
  try {
    // Validate request body using the schema
    const userData = await qera.validate(registerSchema);
    
    Logger.info('User registration attempt', { email: userData.email });
    
    // Simulate user creation
    const newUser = {
      id: Math.floor(Math.random() * 1000),
      ...userData,
      password: '[HASHED]', // In real app, hash the password
      createdAt: new Date().toISOString()
    };
    
    Logger.info('User registered successfully', { userId: newUser.id, email: newUser.email });
    
    return qera.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        age: newUser.age,
        role: newUser.role,
        preferences: newUser.preferences,
        createdAt: newUser.createdAt
      }
    });
    
  } catch (error: any) {
    Logger.error('User registration failed', { error: error.message });
    
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

// Get users with query validation
app.get('/api/users', async (qera) => {
  try {
    // Validate query parameters
    const query = qera.validateQuery(getUsersQuerySchema);
    
    Logger.info('Getting users with filters', query);
    
    // Simulate database query with filters
    const mockUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'user', age: 25 },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'admin', age: 30 },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', age: 28 }
    ];
    
    let filteredUsers = mockUsers;
    
    // Apply role filter
    if (query.role) {
      filteredUsers = filteredUsers.filter(user => user.role === query.role);
    }
    
    // Apply search filter
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm) || 
        user.email.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply pagination
    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    return qera.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / query.limit)
      }
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

// Update user endpoint
app.put('/api/users/:id', async (qera) => {
  try {
    const userId = parseInt(qera.params.id);
    if (isNaN(userId) || userId <= 0) {
      return qera.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Validate request body
    const updateData = await qera.validate(updateUserSchema);
    
    Logger.info('User update attempt', { userId, updateData });
    
    // Simulate user update
    const updatedUser = {
      id: userId,
      name: updateData.name || 'John Doe',
      email: updateData.email || 'john@example.com',
      age: updateData.age || 25,
      preferences: updateData.preferences || {},
      updatedAt: new Date().toISOString()
    };
    
    Logger.info('User updated successfully', { userId });
    
    return qera.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
    
  } catch (error: any) {
    Logger.error('User update failed', { error: error.message });
    
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

// File upload with validation
const fileUploadSchema = v.object({
  title: v.string().min(1, 'Title is required').max(200),
  description: v.string().max(1000).optional(),
  category: v.enum(['image', 'document', 'video']),
  tags: v.array(v.string()).min(1).max(10),
  isPublic: v.boolean().default(false)
});

app.post('/api/files/upload', async (qera) => {
  try {
    // Validate form data
    const fileData = await qera.validate(fileUploadSchema);
    
    Logger.info('File upload attempt', { title: fileData.title, category: fileData.category });
    
    // Simulate file processing
    const uploadedFile = {
      id: Math.floor(Math.random() * 1000),
      ...fileData,
      filename: `${Date.now()}_example.${fileData.category === 'image' ? 'jpg' : 'pdf'}`,
      size: Math.floor(Math.random() * 10000000), // Random size in bytes
      uploadedAt: new Date().toISOString()
    };
    
    Logger.info('File uploaded successfully', { fileId: uploadedFile.id });
    
    return qera.json({
      success: true,
      message: 'File uploaded successfully',
      file: uploadedFile
    });
    
  } catch (error: any) {
    Logger.error('File upload failed', { error: error.message });
    
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

// Health check endpoint (no validation needed)
app.get('/health', (qera) => {
  return qera.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    validator: 'Qera Custom Validator v1.0'
  });
});

// Global error handler
app.use((error: any, qera: any) => {
  Logger.error('Unhandled error', { error: error.message });
  
  return qera.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT);

Logger.info(`Qera API server running on port ${PORT}`);
Logger.info('Available endpoints:');
Logger.info('  POST /api/users/register - Register new user');
Logger.info('  GET  /api/users - Get users with filters');
Logger.info('  PUT  /api/users/:id - Update user');
Logger.info('  POST /api/files/upload - Upload file');
Logger.info('  GET  /health - Health check');
Logger.info('');
Logger.info('Try these test requests:');
Logger.info('  curl -X POST http://localhost:3000/api/users/register \\');
Logger.info('    -H "Content-Type: application/json" \\');
Logger.info('    -d \'{"name":"John Doe","email":"john@example.com","password":"Password123","age":25}\'');
Logger.info('');
Logger.info('  curl "http://localhost:3000/api/users?page=1&limit=10&role=user"');
