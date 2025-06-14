# Qera Custom Validator System

Qera framework memiliki sistem validasi bawaan yang mirip dengan Zod tetapi tanpa dependensi eksternal. Sistem ini menyediakan API yang powerful dan type-safe untuk validasi data.

## Features

- **Type-safe**: Full TypeScript support dengan type inference
- **Zod-like API**: Familiar API untuk developer yang sudah menggunakan Zod
- **Zero dependencies**: Tidak memerlukan library eksternal
- **Rich validation**: Support untuk string, number, boolean, array, object, union, enum, literal
- **Transform support**: Kemampuan untuk mentransformasi data saat validasi
- **Custom refinements**: Validasi custom dengan predicate functions
- **Comprehensive error handling**: Error messages yang detail dan terstruktur
- **Integration dengan Qera Context**: Method `validate()` dan `validateQuery()` bawaan

## Basic Usage

```typescript
import { v } from 'qera';

// String validation
const nameSchema = v.string().min(2).max(50);
const name = nameSchema.parse("John Doe"); // "John Doe"

// Email validation
const emailSchema = v.string().email();
const email = emailSchema.parse("user@example.com"); // "user@example.com"

// Number validation
const ageSchema = v.number().int().min(18).max(100);
const age = ageSchema.parse(25); // 25
```

## Schema Types

### String Schema

```typescript
v.string()
  .min(2, "Must be at least 2 characters")
  .max(50, "Must be at most 50 characters")
  .email("Invalid email format")
  .url("Invalid URL format")
  .uuid("Invalid UUID format")
  .regex(/^[A-Z]+$/, "Must be uppercase letters only")
```

### Number Schema

```typescript
v.number()
  .int("Must be an integer")
  .positive("Must be positive")
  .negative("Must be negative")
  .min(0, "Must be at least 0")
  .max(100, "Must be at most 100")
```

### Boolean Schema

```typescript
v.boolean()
```

### Array Schema

```typescript
v.array(v.string())
  .min(1, "Must have at least 1 item")
  .max(10, "Must have at most 10 items")
  .nonempty("Array cannot be empty")
```

### Object Schema

```typescript
const userSchema = v.object({
  name: v.string().min(2),
  email: v.string().email(),
  age: v.number().int().min(18).optional(),
  role: v.enum(['admin', 'user']).default('user')
});
```

### Union Schema

```typescript
const idSchema = v.union(
  v.string().uuid(),
  v.number().int().positive()
);
```

### Enum Schema

```typescript
const roleSchema = v.enum(['admin', 'user', 'moderator']);
```

### Literal Schema

```typescript
const statusSchema = v.literal('active');
```

## Advanced Features

### Optional and Default Values

```typescript
const configSchema = v.object({
  host: v.string().default('localhost'),
  port: v.number().default(3000),
  debug: v.boolean().optional(),
  timeout: v.number().nullable()
});
```

### Data Transformation

```typescript
const querySchema = v.object({
  page: v.string().transform(val => parseInt(val)),
  limit: v.string().transform(val => parseInt(val)),
  active: v.string().transform(val => val === 'true')
});
```

### Custom Refinements

```typescript
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
    (value) => /\\d/.test(value),
    'Password must contain at least one number'
  );
```

## Integration dengan Qera Framework

### Request Body Validation

```typescript
app.post('/users', async (qera) => {
  try {
    const userData = qera.validate(userSchema);
    
    // userData is now typed and validated
    console.log(userData.name); // string
    console.log(userData.email); // string
    console.log(userData.age); // number | undefined
    
    return qera.json({ success: true, user: userData });
    
  } catch (error) {
    if (error.name === 'QeraValidationError') {
      return qera.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.format()
      });
    }
    
    return qera.status(500).json({ success: false, message: 'Server error' });
  }
});
```

### Query Parameters Validation

```typescript
const querySchema = v.object({
  page: v.string().transform(val => parseInt(val)).refine(val => val > 0).default(1),
  limit: v.string().transform(val => parseInt(val)).refine(val => val <= 100).default(10),
  search: v.string().optional(),
  category: v.enum(['tech', 'business', 'lifestyle']).optional()
});

app.get('/posts', async (qera) => {
  try {
    const query = qera.validateQuery(querySchema);
    
    // query is typed: { page: number, limit: number, search?: string, category?: string }
    
    return qera.json({
      posts: [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0
      }
    });
    
  } catch (error) {
    if (error.name === 'QeraValidationError') {
      return qera.status(400).json({
        success: false,
        errors: error.format()
      });
    }
    
    return qera.status(500).json({ success: false });
  }
});
```

## Error Handling

### Parse vs SafeParse

```typescript
// parse() throws error on validation failure
try {
  const result = schema.parse(data);
} catch (error) {
  console.log(error.issues); // ValidationError[]
}

// safeParse() returns result object
const result = schema.safeParse(data);
if (result.success) {
  console.log(result.data); // validated data
} else {
  console.log(result.error.issues); // ValidationError[]
}
```

### Error Format

```typescript
const result = schema.safeParse({
  name: "J",
  email: "invalid",
  age: "not-a-number"
});

if (!result.success) {
  console.log(result.error.format());
  // Output:
  // {
  //   name: { _errors: ["String must contain at least 2 character(s)"] },
  //   email: { _errors: ["Invalid email"] },
  //   age: { _errors: ["Expected number, received string"] }
  // }
}
```

## Type Inference

```typescript
import { v, type infer as InferType } from 'qera';

const userSchema = v.object({
  name: v.string(),
  email: v.string().email(),
  age: v.number().optional()
});

type User = InferType<typeof userSchema>;
// User = { name: string; email: string; age?: number }
```

## Complex Example

```typescript
import Qera, { v } from 'qera';

const app = Qera();

// Complex nested schema
const createPostSchema = v.object({
  title: v.string().min(1).max(200),
  content: v.string().min(10),
  author: v.object({
    name: v.string().min(2),
    email: v.string().email(),
    bio: v.string().max(500).optional()
  }),
  tags: v.array(v.string()).min(1).max(10),
  category: v.enum(['tech', 'business', 'lifestyle']),
  publishedAt: v.string().transform(val => new Date(val)).optional(),
  metadata: v.object({
    featured: v.boolean().default(false),
    priority: v.number().int().min(1).max(5).default(3),
    seo: v.object({
      title: v.string().max(60).optional(),
      description: v.string().max(160).optional(),
      keywords: v.array(v.string()).max(10).optional()
    }).optional()
  }).optional()
});

app.post('/posts', async (qera) => {
  try {
    const postData = qera.validate(createPostSchema);
    
    // All data is now validated and typed
    console.log(postData.title); // string
    console.log(postData.author.email); // string
    console.log(postData.metadata?.priority); // number | undefined
    
    // Create post logic here...
    
    return qera.status(201).json({
      success: true,
      post: postData
    });
    
  } catch (error) {
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
```

## Migration dari Zod

Jika Anda sebelumnya menggunakan Zod, migrasi ke Qera validator sangat mudah:

```typescript
// Sebelum (dengan Zod)
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().int().min(18).optional()
});

// Sesudah (dengan Qera)
import { v } from 'qera';

const schema = v.object({
  name: v.string().min(2),
  email: v.string().email(),
  age: v.number().int().min(18).optional()
});
```

Hampir semua API Zod yang umum digunakan didukung oleh Qera validator dengan sintaks yang identik.

## Performance

Qera validator dioptimalkan untuk performa tinggi:

- Validasi dilakukan secara synchronous untuk kecepatan maksimal
- Error handling yang efisien dengan lazy evaluation
- Memory footprint yang minimal karena tidak ada dependensi eksternal
- Type inference yang optimal dengan TypeScript

## Best Practices

1. **Define schemas outside handlers**: Schema definition sebaiknya dilakukan di luar handler untuk reusability
2. **Use safeParse for non-critical validation**: Gunakan `safeParse()` jika Anda ingin handle error secara manual
3. **Leverage transform for data cleaning**: Gunakan `transform()` untuk membersihkan dan mengonversi data
4. **Combine with TypeScript**: Manfaatkan type inference untuk type safety maksimal
5. **Structure error responses consistently**: Gunakan format error yang konsisten di seluruh aplikasi

---

Qera Validator memberikan semua fitur yang Anda butuhkan untuk validasi data yang robust dan type-safe tanpa menambah kompleksitas dependensi eksternal ke proyek Anda.
