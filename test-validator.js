const { v } = require('./dist');

console.log('Testing Qera Validator System');
console.log('============================');

// Test 1: String validation
console.log('\n1. String Validation:');
const nameSchema = v.string().min(2).max(50);

try {
  const result1 = nameSchema.parse('John');
  console.log('✓ Valid name:', result1);
} catch (error) {
  console.log('✗ Error:', error.message);
}

try {
  nameSchema.parse('J');
} catch (error) {
  console.log('✓ Expected error for short name:', error.issues[0].message);
}

// Test 2: Email validation
console.log('\n2. Email Validation:');
const emailSchema = v.string().email();

try {
  const result2 = emailSchema.parse('test@example.com');
  console.log('✓ Valid email:', result2);
} catch (error) {
  console.log('✗ Error:', error.message);
}

try {
  emailSchema.parse('invalid-email');
} catch (error) {
  console.log('✓ Expected error for invalid email:', error.issues[0].message);
}

// Test 3: Number validation
console.log('\n3. Number Validation:');
const ageSchema = v.number().int().min(18).max(100);

try {
  const result3 = ageSchema.parse(25);
  console.log('✓ Valid age:', result3);
} catch (error) {
  console.log('✗ Error:', error.message);
}

try {
  ageSchema.parse(15);
} catch (error) {
  console.log('✓ Expected error for young age:', error.issues[0].message);
}

// Test 4: Object validation
console.log('\n4. Object Validation:');
const userSchema = v.object({
  name: v.string().min(2),
  age: v.number().int().min(18),
  email: v.string().email()
});

try {
  const user = userSchema.parse({
    name: 'John Doe',
    age: 25,
    email: 'john@example.com'
  });
  console.log('✓ Valid user:', user);
} catch (error) {
  console.log('✗ Error:', error.message);
}

try {
  userSchema.parse({
    name: 'A',
    age: 15,
    email: 'invalid'
  });
} catch (error) {
  console.log('✓ Expected errors for invalid user:');
  error.issues.forEach(issue => {
    console.log(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
}

// Test 5: Array validation
console.log('\n5. Array Validation:');
const tagsSchema = v.array(v.string()).min(1).max(5);

try {
  const tags = tagsSchema.parse(['javascript', 'typescript', 'node']);
  console.log('✓ Valid tags:', tags);
} catch (error) {
  console.log('✗ Error:', error.message);
}

// Test 6: Optional and default values
console.log('\n6. Optional and Default Values:');
const configSchema = v.object({
  host: v.string().default('localhost'),
  port: v.number().default(3000),
  debug: v.boolean().optional()
});

try {
  const config1 = configSchema.parse({});
  console.log('✓ Config with defaults:', config1);
  
  const config2 = configSchema.parse({ host: '0.0.0.0', debug: true });
  console.log('✓ Config with custom values:', config2);
} catch (error) {
  console.log('✗ Error:', error.message);
}

console.log('\n============================');
console.log('Validator System Test Complete!');
