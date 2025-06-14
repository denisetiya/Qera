const { v } = require('./dist');

console.log('Testing Advanced Validator Features');
console.log('==================================');

// Test 1: Union types
console.log('\n1. Union Types:');
const idSchema = v.union(v.string().uuid(), v.number().int().positive());

try {
  console.log('✓ UUID valid:', idSchema.parse('550e8400-e29b-41d4-a716-446655440000'));
  console.log('✓ Number valid:', idSchema.parse(123));
} catch (error) {
  console.log('✗ Error:', error.message);
}

try {
  idSchema.parse('invalid-id');
} catch (error) {
  console.log('✓ Expected error for invalid union:', error.issues[0].message);
}

// Test 2: Enum validation
console.log('\n2. Enum Validation:');
const roleSchema = v.enum(['admin', 'user', 'moderator']);

try {
  console.log('✓ Valid role:', roleSchema.parse('admin'));
} catch (error) {
  console.log('✗ Error:', error.message);
}

try {
  roleSchema.parse('invalid-role');
} catch (error) {
  console.log('✓ Expected error for invalid enum:', error.issues[0].message);
}

// Test 3: Literal values
console.log('\n3. Literal Values:');
const statusSchema = v.literal('active');

try {
  console.log('✓ Valid literal:', statusSchema.parse('active'));
} catch (error) {
  console.log('✗ Error:', error.message);
}

try {
  statusSchema.parse('inactive');
} catch (error) {
  console.log('✓ Expected error for wrong literal:', error.issues[0].message);
}

// Test 4: Refinement (custom validation)
console.log('\n4. Refinement Validation:');
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

try {
  console.log('✓ Valid password:', passwordSchema.parse('Password123'));
} catch (error) {
  console.log('✗ Error:', error.message);
}

try {
  passwordSchema.parse('password');
} catch (error) {
  console.log('✓ Expected error for weak password:');
  error.issues.forEach(issue => {
    console.log(`  - ${issue.message}`);
  });
}

// Test 5: Nested objects
console.log('\n5. Nested Objects:');
const profileSchema = v.object({
  user: v.object({
    name: v.string().min(1),
    email: v.string().email()
  }),
  settings: v.object({
    theme: v.enum(['light', 'dark']),
    notifications: v.boolean().default(true)
  }),
  tags: v.array(v.string()).optional()
});

try {
  const profile = profileSchema.parse({
    user: {
      name: 'John Doe',
      email: 'john@example.com'
    },
    settings: {
      theme: 'dark'
    }
  });
  console.log('✓ Valid nested object:', JSON.stringify(profile, null, 2));
} catch (error) {
  console.log('✗ Error:', error.message);
}

// Test 6: SafeParse (no throw)
console.log('\n6. SafeParse (No Throw):');
const safeResult1 = v.string().email().safeParse('valid@example.com');
console.log('✓ SafeParse success:', safeResult1);

const safeResult2 = v.string().email().safeParse('invalid-email');
console.log('✓ SafeParse failure:', safeResult2);

// Test 7: URL and UUID validation
console.log('\n7. URL and UUID Validation:');
const urlSchema = v.string().url();
const uuidSchema = v.string().uuid();

try {
  console.log('✓ Valid URL:', urlSchema.parse('https://example.com'));
  console.log('✓ Valid UUID:', uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000'));
} catch (error) {
  console.log('✗ Error:', error.message);
}

// Test 8: Nullable and undefined
console.log('\n8. Nullable and Undefined:');
const nullableSchema = v.string().nullable();
const optionalSchema = v.string().optional();

try {
  console.log('✓ Nullable with null:', nullableSchema.parse(null));
  console.log('✓ Nullable with string:', nullableSchema.parse('hello'));
  console.log('✓ Optional with undefined:', optionalSchema.parse(undefined));
  console.log('✓ Optional with string:', optionalSchema.parse('hello'));
} catch (error) {
  console.log('✗ Error:', error.message);
}

console.log('\n==================================');
console.log('Advanced Validator Features Test Complete!');
