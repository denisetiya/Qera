// import { parseBufferByContentType, parseUrlEncoded } from '../../src/utils/bodyParser';

// Mock the parseBody function's dependencies, as it's challenging to test directly
// Get the exported functions for testing
const bodyParser = require('../../src/utils/bodyParser');

describe('Body Parser Utilities', () => {
  describe('parseBufferByContentType', () => {
    it('should parse JSON content', () => {
      const buffer = Buffer.from(JSON.stringify({ name: 'Test User', age: 30 }));
      const result = bodyParser.parseBufferByContentType(buffer, 'application/json');
      
      expect(result).toEqual({ name: 'Test User', age: 30 });
    });

    it('should parse URL encoded content', () => {
      const buffer = Buffer.from('name=Test+User&age=30');
      const result = bodyParser.parseBufferByContentType(buffer, 'application/x-www-form-urlencoded');
      
      expect(result).toEqual({ name: 'Test User', age: '30' });
    });

    it('should parse text content', () => {
      const buffer = Buffer.from('Hello, world!');
      const result = bodyParser.parseBufferByContentType(buffer, 'text/plain');
      
      expect(result).toBe('Hello, world!');
    });

    it('should handle empty buffers', () => {
      const buffer = Buffer.from('');
      const result = bodyParser.parseBufferByContentType(buffer, 'application/json');
      
      expect(result).toEqual({});
    });
  });

  describe('parseUrlEncoded', () => {
    it('should parse simple URL encoded strings', () => {
      const result = bodyParser.parseUrlEncoded('name=Test+User&age=30');
      
      expect(result).toEqual({ name: 'Test User', age: '30' });
    });

    it('should handle URL encoded characters', () => {
      const result = bodyParser.parseUrlEncoded('message=Hello%2C+world%21&email=user%40example.com');
      
      expect(result).toEqual({
        message: 'Hello, world!',
        email: 'user@example.com'
      });
    });

    it('should convert duplicate params to arrays', () => {
      const result = bodyParser.parseUrlEncoded('id=1&id=2&id=3');
      
      expect(result).toEqual({
        id: ['1', '2', '3']
      });
    });

    it('should handle empty values', () => {
      const result = bodyParser.parseUrlEncoded('name=&empty');
      
      expect(result).toEqual({
        name: '',
        empty: ''
      });
    });

    it('should handle empty input', () => {
      const result = bodyParser.parseUrlEncoded('');
      
      expect(result).toEqual({});
    });
  });
});
