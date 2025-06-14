import Qera, { v, Logger } from '../src';

const app = Qera();

// Example 1: Simple string validation
const nameSchema = v.string().min(2).max(50);

// Example 2: Email validation
const emailSchema = v.string().email();

// Example 3: Number validation with constraints
const ageSchema = v.number().int().min(18).max(100);

// Example 4: Complex object validation
const userSchema = v.object({
  name: v.string().min(2).max(100),
  email: v.string().email(),
  age: v.number().int().min(18).optional(),
  role: v.enum(['admin', 'user', 'moderator']),
  preferences: v.object({
    newsletter: v.boolean(),
    notifications: v.boolean().default(true)
  }).optional(),
  tags: v.array(v.string()).min(1).max(5).optional()
});

// Example 5: Union types
const idSchema = v.union(v.string().uuid(), v.number().int().positive());

// Example 6: Refined validation
const passwordSchema = v.string()
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
  );

// Example 7: Nested array validation
const postSchema = v.object({
  title: v.string().min(1).max(200),
  content: v.string().min(10),
  author: userSchema,
  comments: v.array(v.object({
    id: v.string().uuid(),
    text: v.string().min(1).max(500),
    author: v.string(),
    createdAt: v.string() // In real app, you might want to parse dates
  })).optional().default([]),
  published: v.boolean().default(false)
});

// Routes using validation
app.post('/users', (qera) => {
  try {
    // Using our new validator
    const userData = qera.validate(userSchema);
    
    Logger.info('User registration', { email: userData.email });
    
    qera.status(201).json({
      message: 'User created successfully',
      user: {
        ...userData,
        id: Math.random().toString(36).substr(2, 9)
      }
    });
  } catch (error) {
    Logger.error('User validation failed', { error: error.message });
  }
});

app.post('/login', (qera) => {
  try {
    const loginSchema = v.object({
      email: v.string().email(),
      password: v.string().min(1)
    });
    
    const { email, password } = qera.validate(loginSchema);
    
    // Here you would check against database
    Logger.info('Login attempt', { email });
    
    qera.json({
      message: 'Login successful',
      token: 'mock-jwt-token'
    });
  } catch (error) {
    Logger.error('Login validation failed', { error: error.message });
  }
});

app.post('/posts', (qera) => {
  try {
    const postData = qera.validate(postSchema);
    
    Logger.info('Post creation', { title: postData.title });
    
    qera.status(201).json({
      message: 'Post created successfully',
      post: {
        ...postData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    Logger.error('Post validation failed', { error: error.message });
  }
});

// Example of manual validation outside route handlers
function validateUserManually() {
  // Valid data
  const validUser = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 25,
    role: 'user',
    preferences: {
      newsletter: true,
      notifications: false
    },
    tags: ['developer', 'javascript']
  };

  // Invalid data
  const invalidUser = {
    name: 'A', // Too short
    email: 'invalid-email', // Invalid format
    age: 15, // Too young
    role: 'invalid-role', // Not in enum
    tags: [] // Empty array not allowed
  };

  try {
    const validResult = userSchema.parse(validUser);
    Logger.info('Valid user parsed successfully', validResult);
  } catch (error) {
    Logger.error('Should not happen', { error: error.message });
  }

  try {
    const invalidResult = userSchema.parse(invalidUser);
    Logger.info('Should not reach here');
  } catch (error) {
    Logger.error('Invalid user validation failed as expected', { 
      error: error.message,
      details: error.format ? error.format() : 'No details'
    });
  }

  // Using safeParse
  const safeResult = userSchema.safeParse(invalidUser);
  if (!safeResult.success) {
    Logger.warn('Safe parse validation failed', {
      issues: safeResult.error?.issues,
      formatted: safeResult.error?.format()
    });
  }
}

// Test manual validation
validateUserManually();

// Example of extending schemas
const adminUserSchema = userSchema.extend({
  adminLevel: v.number().int().min(1).max(5),
  permissions: v.array(v.string()).min(1)
});

// Example of partial schemas
const updateUserSchema = userSchema.partial();

app.put('/users/:id', (qera) => {
  try {
    const updateData = qera.validate(updateUserSchema);
    const { id } = qera.params;
    
    Logger.info('User update', { id, fields: Object.keys(updateData) });
    
    qera.json({
      message: 'User updated successfully',
      id,
      updatedFields: Object.keys(updateData)
    });
  } catch (error) {
    Logger.error('User update validation failed', { error: error.message });
  }
});

// Start server
const PORT = 3001;
app.listen(PORT, 'localhost');
Logger.info('Validator example server started', { port: PORT });

// Export schemas for testing
export {
  nameSchema,
  emailSchema,
  ageSchema,
  userSchema,
  idSchema,
  passwordSchema,
  postSchema,
  adminUserSchema,
  updateUserSchema
};
