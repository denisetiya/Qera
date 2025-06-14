export interface ValidationError {
  path: string[];
  message: string;
  code: string;
  received?: any;
  expected?: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    issues: ValidationError[];
    format(): Record<string, any>;
  };
}

export abstract class QeraSchema<T = any> {
  abstract _parse(data: any, path: string[]): ValidationResult<T>;

  parse(data: any): T {
    const result = this._parse(data, []);
    if (!result.success) {
      throw new QeraValidationError(result.error!.issues);
    }
    return result.data!;
  }

  safeParse(data: any): ValidationResult<T> {
    try {
      return this._parse(data, []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          issues: [{ path: [], message: errorMessage, code: 'unknown_error' }],
          format: () => ({ _errors: [errorMessage] })
        }
      };
    }
  }

  optional(): QeraOptionalSchema<T> {
    return new QeraOptionalSchema(this);
  }

  nullable(): QeraNullableSchema<T> {
    return new QeraNullableSchema(this);
  }

  default(defaultValue: T): QeraDefaultSchema<T> {
    return new QeraDefaultSchema(this, defaultValue);
  }

  refine<R extends T>(
    predicate: (value: T) => value is R,
    message?: string
  ): QeraRefinementSchema<R>;
  refine(
    predicate: (value: T) => boolean,
    message?: string
  ): QeraRefinementSchema<T>;
  refine(predicate: (value: T) => boolean, message = 'Invalid value'): QeraRefinementSchema<T> {
    return new QeraRefinementSchema(this, predicate, message);
  }

  transform<U>(transformer: (value: T) => U): QeraTransformSchema<T, U> {
    return new QeraTransformSchema(this, transformer);
  }
}

export class QeraValidationError extends Error {
  public issues: ValidationError[];

  constructor(issues: ValidationError[]) {
    super('Validation failed');
    this.name = 'QeraValidationError';
    this.issues = issues;
  }

  format(): Record<string, any> {
    const formatted: Record<string, any> = {};
    
    for (const issue of this.issues) {
      let current = formatted;
      
      for (let i = 0; i < issue.path.length; i++) {
        const key = issue.path[i];
        
        if (i === issue.path.length - 1) {
          if (!current[key]) current[key] = { _errors: [] };
          current[key]._errors.push(issue.message);
        } else {
          if (!current[key]) current[key] = {};
          current = current[key];
        }
      }
      
      if (issue.path.length === 0) {
        if (!formatted._errors) formatted._errors = [];
        formatted._errors.push(issue.message);
      }
    }
    
    return formatted;
  }
}

// String Schema
export class QeraStringSchema extends QeraSchema<string> {
  private _min?: number;
  private _max?: number;
  private _pattern?: RegExp;
  private _email = false;
  private _url = false;
  private _uuid = false;

  _parse(data: any, path: string[]): ValidationResult<string> {
    if (typeof data !== 'string') {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: `Expected string, received ${typeof data}`,
            code: 'invalid_type',
            received: typeof data,
            expected: 'string'
          }],
          format: () => this.formatError(path, `Expected string, received ${typeof data}`)
        }
      };
    }

    const issues: ValidationError[] = [];

    if (this._min !== undefined && data.length < this._min) {
      issues.push({
        path,
        message: `String must contain at least ${this._min} character(s)`,
        code: 'too_small',
        received: data.length
      });
    }

    if (this._max !== undefined && data.length > this._max) {
      issues.push({
        path,
        message: `String must contain at most ${this._max} character(s)`,
        code: 'too_big',
        received: data.length
      });
    }

    if (this._pattern && !this._pattern.test(data)) {
      issues.push({
        path,
        message: 'Invalid format',
        code: 'invalid_string'
      });
    }

    if (this._email && !this.isEmail(data)) {
      issues.push({
        path,
        message: 'Invalid email',
        code: 'invalid_string'
      });
    }

    if (this._url && !this.isUrl(data)) {
      issues.push({
        path,
        message: 'Invalid url',
        code: 'invalid_string'
      });
    }

    if (this._uuid && !this.isUuid(data)) {
      issues.push({
        path,
        message: 'Invalid uuid',
        code: 'invalid_string'
      });
    }

    if (issues.length > 0) {
      return {
        success: false,
        error: {
          issues,
          format: () => this.formatMultipleErrors(path, issues)
        }
      };
    }

    return { success: true, data };
  }

  min(length: number, message?: string): this {
    this._min = length;
    return this;
  }

  max(length: number, message?: string): this {
    this._max = length;
    return this;
  }

  length(length: number, message?: string): this {
    this._min = length;
    this._max = length;
    return this;
  }

  regex(pattern: RegExp, message?: string): this {
    this._pattern = pattern;
    return this;
  }

  email(message?: string): this {
    this._email = true;
    return this;
  }

  url(message?: string): this {
    this._url = true;
    return this;
  }

  uuid(message?: string): this {
    this._uuid = true;
    return this;
  }

  private isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private isUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private isUuid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }

  private formatMultipleErrors(path: string[], issues: ValidationError[]): Record<string, any> {
    if (path.length === 0) return { _errors: issues.map(i => i.message) };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: issues.map(i => i.message) };
    return result;
  }
}

// Number Schema
export class QeraNumberSchema extends QeraSchema<number> {
  private _min?: number;
  private _max?: number;
  private _int = false;
  private _positive = false;
  private _negative = false;
  private _nonnegative = false;

  _parse(data: any, path: string[]): ValidationResult<number> {
    if (typeof data !== 'number' || isNaN(data)) {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: `Expected number, received ${typeof data}`,
            code: 'invalid_type',
            received: typeof data,
            expected: 'number'
          }],
          format: () => this.formatError(path, `Expected number, received ${typeof data}`)
        }
      };
    }

    const issues: ValidationError[] = [];

    if (this._int && !Number.isInteger(data)) {
      issues.push({
        path,
        message: 'Expected integer, received float',
        code: 'invalid_type'
      });
    }

    if (this._min !== undefined && data < this._min) {
      issues.push({
        path,
        message: `Number must be greater than or equal to ${this._min}`,
        code: 'too_small',
        received: data
      });
    }

    if (this._max !== undefined && data > this._max) {
      issues.push({
        path,
        message: `Number must be less than or equal to ${this._max}`,
        code: 'too_big',
        received: data
      });
    }

    if (this._positive && data <= 0) {
      issues.push({
        path,
        message: 'Number must be positive',
        code: 'too_small'
      });
    }

    if (this._negative && data >= 0) {
      issues.push({
        path,
        message: 'Number must be negative',
        code: 'too_big'
      });
    }

    if (this._nonnegative && data < 0) {
      issues.push({
        path,
        message: 'Number must be non-negative',
        code: 'too_small'
      });
    }

    if (issues.length > 0) {
      return {
        success: false,
        error: {
          issues,
          format: () => this.formatMultipleErrors(path, issues)
        }
      };
    }

    return { success: true, data };
  }

  min(value: number): this {
    this._min = value;
    return this;
  }

  max(value: number): this {
    this._max = value;
    return this;
  }

  int(): this {
    this._int = true;
    return this;
  }

  positive(): this {
    this._positive = true;
    return this;
  }

  negative(): this {
    this._negative = true;
    return this;
  }

  nonnegative(): this {
    this._nonnegative = true;
    return this;
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }

  private formatMultipleErrors(path: string[], issues: ValidationError[]): Record<string, any> {
    if (path.length === 0) return { _errors: issues.map(i => i.message) };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: issues.map(i => i.message) };
    return result;
  }
}

// Boolean Schema
export class QeraBooleanSchema extends QeraSchema<boolean> {
  _parse(data: any, path: string[]): ValidationResult<boolean> {
    if (typeof data !== 'boolean') {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: `Expected boolean, received ${typeof data}`,
            code: 'invalid_type',
            received: typeof data,
            expected: 'boolean'
          }],
          format: () => this.formatError(path, `Expected boolean, received ${typeof data}`)
        }
      };
    }

    return { success: true, data };
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }
}

// Array Schema
export class QeraArraySchema<T> extends QeraSchema<T[]> {
  private _min?: number;
  private _max?: number;

  constructor(private element: QeraSchema<T>) {
    super();
  }

  _parse(data: any, path: string[]): ValidationResult<T[]> {
    if (!Array.isArray(data)) {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: `Expected array, received ${typeof data}`,
            code: 'invalid_type',
            received: typeof data,
            expected: 'array'
          }],
          format: () => this.formatError(path, `Expected array, received ${typeof data}`)
        }
      };
    }

    const issues: ValidationError[] = [];

    if (this._min !== undefined && data.length < this._min) {
      issues.push({
        path,
        message: `Array must contain at least ${this._min} element(s)`,
        code: 'too_small',
        received: data.length
      });
    }

    if (this._max !== undefined && data.length > this._max) {
      issues.push({
        path,
        message: `Array must contain at most ${this._max} element(s)`,
        code: 'too_big',
        received: data.length
      });
    }

    const parsedData: T[] = [];

    for (let i = 0; i < data.length; i++) {
      const elementResult = this.element._parse(data[i], [...path, i.toString()]);
      if (!elementResult.success) {
        issues.push(...elementResult.error!.issues);
      } else {
        parsedData[i] = elementResult.data!;
      }
    }

    if (issues.length > 0) {
      return {
        success: false,
        error: {
          issues,
          format: () => this.formatMultipleErrors(issues)
        }
      };
    }

    return { success: true, data: parsedData };
  }

  min(length: number): this {
    this._min = length;
    return this;
  }

  max(length: number): this {
    this._max = length;
    return this;
  }

  length(length: number): this {
    this._min = length;
    this._max = length;
    return this;
  }

  nonempty(): this {
    this._min = 1;
    return this;
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }

  private formatMultipleErrors(issues: ValidationError[]): Record<string, any> {
    const formatted: Record<string, any> = {};
    
    for (const issue of issues) {
      let current = formatted;
      
      for (let i = 0; i < issue.path.length; i++) {
        const key = issue.path[i];
        
        if (i === issue.path.length - 1) {
          if (!current[key]) current[key] = { _errors: [] };
          current[key]._errors.push(issue.message);
        } else {
          if (!current[key]) current[key] = {};
          current = current[key];
        }
      }
      
      if (issue.path.length === 0) {
        if (!formatted._errors) formatted._errors = [];
        formatted._errors.push(issue.message);
      }
    }
    
    return formatted;
  }
}

// Object Schema
export class QeraObjectSchema<T extends Record<string, any>> extends QeraSchema<T> {
  private _strict = false;
  private _passthrough = false;

  constructor(private shape: { [K in keyof T]: QeraSchema<T[K]> }) {
    super();
  }

  _parse(data: any, path: string[]): ValidationResult<T> {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: `Expected object, received ${data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data}`,
            code: 'invalid_type',
            received: data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data,
            expected: 'object'
          }],
          format: () => this.formatError(path, `Expected object, received ${data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data}`)
        }
      };
    }

    const issues: ValidationError[] = [];
    const parsedData: any = this._passthrough ? { ...data } : {};

    // Validate known keys
    for (const [key, schema] of Object.entries(this.shape)) {
      const fieldResult = (schema as QeraSchema<any>)._parse(data[key], [...path, key]);
      if (!fieldResult.success) {
        issues.push(...fieldResult.error!.issues);
      } else {
        parsedData[key] = fieldResult.data;
      }
    }

    // Check for unknown keys if strict mode
    if (this._strict) {
      for (const key of Object.keys(data)) {
        if (!(key in this.shape)) {
          issues.push({
            path: [...path, key],
            message: `Unrecognized key(s) in object: '${key}'`,
            code: 'unrecognized_keys'
          });
        }
      }
    }

    if (issues.length > 0) {
      return {
        success: false,
        error: {
          issues,
          format: () => this.formatMultipleErrors(issues)
        }
      };
    }

    return { success: true, data: parsedData as T };
  }

  strict(): this {
    this._strict = true;
    return this;
  }

  passthrough(): this {
    this._passthrough = true;
    return this;
  }

  partial(): QeraObjectSchema<Partial<T>> {
    const newShape: any = {};
    for (const [key, schema] of Object.entries(this.shape)) {
      newShape[key] = (schema as QeraSchema<any>).optional();
    }
    return new QeraObjectSchema(newShape);
  }

  pick<K extends keyof T>(keys: K[]): QeraObjectSchema<Pick<T, K>> {
    const newShape: any = {};
    for (const key of keys) {
      newShape[key] = this.shape[key];
    }
    return new QeraObjectSchema(newShape);
  }

  omit<K extends keyof T>(keys: K[]): QeraObjectSchema<Omit<T, K>> {
    const newShape: any = {};
    for (const [key, schema] of Object.entries(this.shape)) {
      if (!keys.includes(key as K)) {
        newShape[key] = schema;
      }
    }
    return new QeraObjectSchema(newShape);
  }

  extend<U extends Record<string, any>>(
    extension: { [K in keyof U]: QeraSchema<U[K]> }
  ): QeraObjectSchema<T & U> {
    return new QeraObjectSchema({ ...this.shape, ...extension } as any);
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }

  private formatMultipleErrors(issues: ValidationError[]): Record<string, any> {
    const formatted: Record<string, any> = {};
    
    for (const issue of issues) {
      let current = formatted;
      
      for (let i = 0; i < issue.path.length; i++) {
        const key = issue.path[i];
        
        if (i === issue.path.length - 1) {
          if (!current[key]) current[key] = { _errors: [] };
          current[key]._errors.push(issue.message);
        } else {
          if (!current[key]) current[key] = {};
          current = current[key];
        }
      }
      
      if (issue.path.length === 0) {
        if (!formatted._errors) formatted._errors = [];
        formatted._errors.push(issue.message);
      }
    }
    
    return formatted;
  }
}

// Optional Schema
export class QeraOptionalSchema<T> extends QeraSchema<T | undefined> {
  constructor(private innerSchema: QeraSchema<T>) {
    super();
  }

  _parse(data: any, path: string[]): ValidationResult<T | undefined> {
    if (data === undefined) {
      return { success: true, data: undefined };
    }

    return this.innerSchema._parse(data, path);
  }
}

// Nullable Schema
export class QeraNullableSchema<T> extends QeraSchema<T | null> {
  constructor(private innerSchema: QeraSchema<T>) {
    super();
  }

  _parse(data: any, path: string[]): ValidationResult<T | null> {
    if (data === null) {
      return { success: true, data: null };
    }

    return this.innerSchema._parse(data, path);
  }
}

// Default Schema
export class QeraDefaultSchema<T> extends QeraSchema<T> {
  constructor(
    private innerSchema: QeraSchema<T>,
    private defaultValue: T
  ) {
    super();
  }

  _parse(data: any, path: string[]): ValidationResult<T> {
    if (data === undefined) {
      return { success: true, data: this.defaultValue };
    }

    return this.innerSchema._parse(data, path);
  }
}

// Refinement Schema
export class QeraRefinementSchema<T> extends QeraSchema<T> {
  constructor(
    private innerSchema: QeraSchema<T>,
    private predicate: (value: T) => boolean,
    private message: string
  ) {
    super();
  }

  _parse(data: any, path: string[]): ValidationResult<T> {
    const result = this.innerSchema._parse(data, path);
    if (!result.success) {
      return result;
    }

    if (!this.predicate(result.data!)) {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: this.message,
            code: 'custom'
          }],
          format: () => this.formatError(path, this.message)
        }
      };
    }

    return result;
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }
}

// Union Schema
export class QeraUnionSchema<T extends readonly [QeraSchema<any>, ...QeraSchema<any>[]]> extends QeraSchema<
  T[number] extends QeraSchema<infer U> ? U : never
> {
  constructor(private schemas: T) {
    super();
  }

  _parse(data: any, path: string[]): ValidationResult<any> {
    const issues: ValidationError[] = [];

    for (const schema of this.schemas) {
      const result = schema._parse(data, path);
      if (result.success) {
        return result;
      }
      issues.push(...result.error!.issues);
    }

    return {
      success: false,
      error: {
        issues: [{
          path,
          message: 'Invalid input',
          code: 'invalid_union'
        }],
        format: () => this.formatError(path, 'Invalid input')
      }
    };
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }
}

// Literal Schema
export class QeraLiteralSchema<T extends string | number | boolean> extends QeraSchema<T> {
  constructor(private value: T) {
    super();
  }

  _parse(data: any, path: string[]): ValidationResult<T> {
    if (data !== this.value) {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: `Invalid literal value, expected ${JSON.stringify(this.value)}`,
            code: 'invalid_literal',
            received: data,
            expected: JSON.stringify(this.value)
          }],
          format: () => this.formatError(path, `Invalid literal value, expected ${JSON.stringify(this.value)}`)
        }
      };
    }

    return { success: true, data };
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }
}

// Enum Schema
export class QeraEnumSchema<T extends readonly [string, ...string[]]> extends QeraSchema<T[number]> {
  constructor(private values: T) {
    super();
  }

  _parse(data: any, path: string[]): ValidationResult<T[number]> {
    if (!this.values.includes(data)) {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: `Invalid enum value. Expected ${this.values.map(v => `'${v}'`).join(' | ')}, received '${data}'`,
            code: 'invalid_enum_value',
            received: data,
            expected: this.values.join(' | ')
          }],
          format: () => this.formatError(path, `Invalid enum value. Expected ${this.values.map(v => `'${v}'`).join(' | ')}, received '${data}'`)
        }
      };
    }

    return { success: true, data };
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }
}

// Transform Schema
export class QeraTransformSchema<T, U> extends QeraSchema<U> {
  constructor(
    private innerSchema: QeraSchema<T>,
    private transformer: (value: T) => U
  ) {
    super();
  }

  _parse(data: any, path: string[]): ValidationResult<U> {
    const result = this.innerSchema._parse(data, path);
    if (!result.success) {
      return {
        success: false,
        error: result.error
      } as ValidationResult<U>;
    }

    try {
      const transformed = this.transformer(result.data!);
      return { success: true, data: transformed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transformation failed';
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: errorMessage,
            code: 'custom'
          }],
          format: () => this.formatError(path, errorMessage)
        }
      };
    }
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }
}

// Main validator object (mirip dengan 'z' di Zod)
export const v = {
  string: () => new QeraStringSchema(),
  number: () => new QeraNumberSchema(),
  boolean: () => new QeraBooleanSchema(),
  array: <T>(element: QeraSchema<T>) => new QeraArraySchema(element),
  object: <T extends Record<string, any>>(shape: { [K in keyof T]: QeraSchema<T[K]> }) => new QeraObjectSchema(shape),
  union: <T extends readonly [QeraSchema<any>, ...QeraSchema<any>[]]>(...schemas: T) => new QeraUnionSchema(schemas),
  literal: <T extends string | number | boolean>(value: T) => new QeraLiteralSchema(value),
  enum: <T extends readonly [string, ...string[]]>(values: T) => new QeraEnumSchema(values),
  any: () => new QeraAnySchema(),
  unknown: () => new QeraUnknownSchema(),
  void: () => new QeraVoidSchema(),
  null: () => new QeraNullSchema(),
  undefined: () => new QeraUndefinedSchema(),
};

// Additional schemas
export class QeraAnySchema extends QeraSchema<any> {
  _parse(data: any, path: string[]): ValidationResult<any> {
    return { success: true, data };
  }
}

export class QeraUnknownSchema extends QeraSchema<unknown> {
  _parse(data: any, path: string[]): ValidationResult<unknown> {
    return { success: true, data };
  }
}

export class QeraVoidSchema extends QeraSchema<void> {
  _parse(data: any, path: string[]): ValidationResult<void> {
    if (data !== undefined) {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: `Expected void, received ${typeof data}`,
            code: 'invalid_type',
            received: typeof data,
            expected: 'void'
          }],
          format: () => this.formatError(path, `Expected void, received ${typeof data}`)
        }
      };
    }

    return { success: true, data: undefined as void };
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }
}

export class QeraNullSchema extends QeraSchema<null> {
  _parse(data: any, path: string[]): ValidationResult<null> {
    if (data !== null) {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: `Expected null, received ${typeof data}`,
            code: 'invalid_type',
            received: typeof data,
            expected: 'null'
          }],
          format: () => this.formatError(path, `Expected null, received ${typeof data}`)
        }
      };
    }

    return { success: true, data };
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }
}

export class QeraUndefinedSchema extends QeraSchema<undefined> {
  _parse(data: any, path: string[]): ValidationResult<undefined> {
    if (data !== undefined) {
      return {
        success: false,
        error: {
          issues: [{
            path,
            message: `Expected undefined, received ${typeof data}`,
            code: 'invalid_type',
            received: typeof data,
            expected: 'undefined'
          }],
          format: () => this.formatError(path, `Expected undefined, received ${typeof data}`)
        }
      };
    }

    return { success: true, data };
  }

  private formatError(path: string[], message: string): Record<string, any> {
    if (path.length === 0) return { _errors: [message] };
    
    const result: Record<string, any> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = { _errors: [message] };
    return result;
  }
}

// Type inference helpers
export type infer<T extends QeraSchema<any>> = T extends QeraSchema<infer U> ? U : never;

export default v;
