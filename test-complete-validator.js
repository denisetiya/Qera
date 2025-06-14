const { v } = require('./dist');

console.log('🧪 Comprehensive Qera Validator Test Suite');
console.log('==========================================');

let testsRun = 0;
let testsPassed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertThrows(fn, expectedErrorType) {
  try {
    fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (expectedErrorType && error.name !== expectedErrorType) {
      throw new Error(`Expected ${expectedErrorType}, got ${error.name}`);
    }
  }
}

// String validation tests
test('String basic validation', () => {
  const schema = v.string();
  assertEqual(schema.parse('hello'), 'hello');
  assertThrows(() => schema.parse(123), 'QeraValidationError');
});

test('String min/max length', () => {
  const schema = v.string().min(2).max(5);
  assertEqual(schema.parse('abc'), 'abc');
  assertThrows(() => schema.parse('a'), 'QeraValidationError');
  assertThrows(() => schema.parse('abcdef'), 'QeraValidationError');
});

test('String email validation', () => {
  const schema = v.string().email();
  assertEqual(schema.parse('test@example.com'), 'test@example.com');
  assertThrows(() => schema.parse('invalid-email'), 'QeraValidationError');
});

test('String URL validation', () => {
  const schema = v.string().url();
  assertEqual(schema.parse('https://example.com'), 'https://example.com');
  assertThrows(() => schema.parse('not-a-url'), 'QeraValidationError');
});

test('String UUID validation', () => {
  const schema = v.string().uuid();
  assertEqual(schema.parse('550e8400-e29b-41d4-a716-446655440000'), '550e8400-e29b-41d4-a716-446655440000');
  assertThrows(() => schema.parse('not-a-uuid'), 'QeraValidationError');
});

// Number validation tests
test('Number basic validation', () => {
  const schema = v.number();
  assertEqual(schema.parse(123), 123);
  assertEqual(schema.parse(123.45), 123.45);
  assertThrows(() => schema.parse('123'), 'QeraValidationError');
});

test('Number integer validation', () => {
  const schema = v.number().int();
  assertEqual(schema.parse(123), 123);
  assertThrows(() => schema.parse(123.45), 'QeraValidationError');
});

test('Number min/max validation', () => {
  const schema = v.number().min(10).max(100);
  assertEqual(schema.parse(50), 50);
  assertThrows(() => schema.parse(5), 'QeraValidationError');
  assertThrows(() => schema.parse(150), 'QeraValidationError');
});

test('Number positive/negative validation', () => {
  const positive = v.number().positive();
  const negative = v.number().negative();
  
  assertEqual(positive.parse(10), 10);
  assertThrows(() => positive.parse(-10), 'QeraValidationError');
  
  assertEqual(negative.parse(-10), -10);
  assertThrows(() => negative.parse(10), 'QeraValidationError');
});

// Boolean validation tests
test('Boolean validation', () => {
  const schema = v.boolean();
  assertEqual(schema.parse(true), true);
  assertEqual(schema.parse(false), false);
  assertThrows(() => schema.parse('true'), 'QeraValidationError');
});

// Array validation tests
test('Array basic validation', () => {
  const schema = v.array(v.string());
  assertEqual(schema.parse(['a', 'b', 'c']), ['a', 'b', 'c']);
  assertThrows(() => schema.parse(['a', 123, 'c']), 'QeraValidationError');
});

test('Array min/max length', () => {
  const schema = v.array(v.string()).min(2).max(4);
  assertEqual(schema.parse(['a', 'b', 'c']), ['a', 'b', 'c']);
  assertThrows(() => schema.parse(['a']), 'QeraValidationError');
  assertThrows(() => schema.parse(['a', 'b', 'c', 'd', 'e']), 'QeraValidationError');
});

// Object validation tests
test('Object basic validation', () => {
  const schema = v.object({
    name: v.string(),
    age: v.number()
  });
  
  const result = schema.parse({ name: 'John', age: 30 });
  assertEqual(result, { name: 'John', age: 30 });
  
  assertThrows(() => schema.parse({ name: 'John' }), 'QeraValidationError');
});

test('Object with optional fields', () => {
  const schema = v.object({
    name: v.string(),
    age: v.number().optional(),
    email: v.string().optional()
  });
  
  assertEqual(schema.parse({ name: 'John' }), { name: 'John', age: undefined, email: undefined });
  assertEqual(schema.parse({ name: 'John', age: 30 }), { name: 'John', age: 30, email: undefined });
});

test('Object with default values', () => {
  const schema = v.object({
    name: v.string(),
    role: v.string().default('user'),
    active: v.boolean().default(true)
  });
  
  const result = schema.parse({ name: 'John' });
  assertEqual(result, { name: 'John', role: 'user', active: true });
});

// Union validation tests
test('Union validation', () => {
  const schema = v.union(v.string(), v.number());
  
  assertEqual(schema.parse('hello'), 'hello');
  assertEqual(schema.parse(123), 123);
  assertThrows(() => schema.parse(true), 'QeraValidationError');
});

// Enum validation tests
test('Enum validation', () => {
  const schema = v.enum(['admin', 'user', 'moderator']);
  
  assertEqual(schema.parse('admin'), 'admin');
  assertEqual(schema.parse('user'), 'user');
  assertThrows(() => schema.parse('invalid'), 'QeraValidationError');
});

// Literal validation tests
test('Literal validation', () => {
  const schema = v.literal('active');
  
  assertEqual(schema.parse('active'), 'active');
  assertThrows(() => schema.parse('inactive'), 'QeraValidationError');
});

// Transform tests
test('Transform validation', () => {
  const schema = v.string().transform(val => parseInt(val));
  
  assertEqual(schema.parse('123'), 123);
  assertEqual(schema.parse('456'), 456);
});

test('Transform with validation', () => {
  const schema = v.string().transform(val => parseInt(val)).refine(val => val > 0);
  
  assertEqual(schema.parse('123'), 123);
  assertThrows(() => schema.parse('-123'), 'QeraValidationError');
});

// Refinement tests
test('Refinement validation', () => {
  const schema = v.string().refine(val => val.startsWith('prefix_'), 'Must start with prefix_');
  
  assertEqual(schema.parse('prefix_test'), 'prefix_test');
  assertThrows(() => schema.parse('test'), 'QeraValidationError');
});

test('Multiple refinements', () => {
  const schema = v.string()
    .min(8)
    .refine(val => /[A-Z]/.test(val), 'Must contain uppercase')
    .refine(val => /[0-9]/.test(val), 'Must contain number');
  
  assertEqual(schema.parse('Password123'), 'Password123');
  assertThrows(() => schema.parse('password'), 'QeraValidationError');
  assertThrows(() => schema.parse('PASSWORD'), 'QeraValidationError');
});

// Nullable tests
test('Nullable validation', () => {
  const schema = v.string().nullable();
  
  assertEqual(schema.parse('hello'), 'hello');
  assertEqual(schema.parse(null), null);
  assertThrows(() => schema.parse(undefined), 'QeraValidationError');
});

// SafeParse tests
test('SafeParse success', () => {
  const schema = v.string();
  const result = schema.safeParse('hello');
  
  assertEqual(result.success, true);
  assertEqual(result.data, 'hello');
});

test('SafeParse failure', () => {
  const schema = v.string();
  const result = schema.safeParse(123);
  
  assertEqual(result.success, false);
  assertEqual(result.error !== undefined, true);
});

// Error formatting tests
test('Error formatting', () => {
  const schema = v.object({
    name: v.string().min(2),
    email: v.string().email(),
    age: v.number().min(18)
  });
  
  const result = schema.safeParse({
    name: 'J',
    email: 'invalid',
    age: 15
  });
  
  assertEqual(result.success, false);
  
  const formatted = result.error.format();
  assertEqual(typeof formatted.name._errors, 'object');
  assertEqual(typeof formatted.email._errors, 'object');
  assertEqual(typeof formatted.age._errors, 'object');
});

// Complex nested object test
test('Complex nested object validation', () => {
  const schema = v.object({
    user: v.object({
      name: v.string().min(2),
      email: v.string().email(),
      preferences: v.object({
        theme: v.enum(['light', 'dark']),
        notifications: v.boolean().default(true)
      }).optional()
    }),
    posts: v.array(v.object({
      title: v.string().min(1),
      content: v.string(),
      tags: v.array(v.string()).max(5)
    })).optional()
  });
  
  const validData = {
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      preferences: {
        theme: 'dark'
      }
    },
    posts: [
      {
        title: 'Test Post',
        content: 'This is a test post',
        tags: ['test', 'example']
      }
    ]
  };
  
  const result = schema.parse(validData);
  assertEqual(result.user.name, 'John Doe');
  assertEqual(result.user.preferences.theme, 'dark');
  assertEqual(result.user.preferences.notifications, true);
});

// Performance test
test('Performance test with large object', () => {
  const schema = v.object({
    users: v.array(v.object({
      id: v.number(),
      name: v.string(),
      email: v.string().email(),
      active: v.boolean()
    }))
  });
  
  const largeData = {
    users: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      active: i % 2 === 0
    }))
  };
  
  const start = Date.now();
  const result = schema.parse(largeData);
  const end = Date.now();
  
  assertEqual(result.users.length, 100);
  console.log(`    Performance: ${end - start}ms for 100 objects`);
});

// Summary
console.log('\n==========================================');
console.log(`📊 Test Results: ${testsPassed}/${testsRun} passed`);

if (testsPassed === testsRun) {
  console.log('🎉 All tests passed! Qera Validator is working perfectly.');
} else {
  console.log(`❌ ${testsRun - testsPassed} test(s) failed.`);
  process.exit(1);
}

console.log('\n🚀 Qera Custom Validator System is ready for production use!');
