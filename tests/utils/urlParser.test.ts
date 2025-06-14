import { parseUrl, parseQuery, matchRoute } from '../../src/utils/urlParser';

describe('URL Parser', () => {
  describe('parseQuery', () => {
    it('should parse a simple query string', () => {
      const query = parseQuery('foo=bar&baz=qux');
      expect(query).toEqual({
        foo: 'bar',
        baz: 'qux'
      });
    });

    it('should handle empty query string', () => {
      const query = parseQuery('');
      expect(query).toEqual({});
    });

    it('should handle URL encoded values', () => {
      const query = parseQuery('name=John%20Doe&email=john%40example.com');
      expect(query).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should convert duplicate params to arrays', () => {
      const query = parseQuery('id=1&id=2&id=3');
      expect(query).toEqual({
        id: ['1', '2', '3']
      });
    });

    it('should handle params with no values', () => {
      const query = parseQuery('flag&value=test');
      expect(query).toEqual({
        flag: '',
        value: 'test'
      });
    });
  });

  describe('parseUrl', () => {
    it('should parse URL with query string', () => {
      const result = parseUrl('/path', 'foo=bar&baz=qux');
      expect(result).toEqual({
        query: {
          foo: 'bar',
          baz: 'qux'
        },
        params: {}
      });
    });

    it('should handle URLs without query', () => {
      const result = parseUrl('/path', '');
      expect(result).toEqual({
        query: {},
        params: {}
      });
    });
  });

  describe('matchRoute', () => {
    it('should match a simple route', () => {
      const { match, params } = matchRoute('/users', '/users');
      expect(match).toBe(true);
      expect(params).toEqual({});
    });

    it('should not match different routes', () => {
      const { match, params } = matchRoute('/users', '/posts');
      expect(match).toBe(false);
      expect(params).toEqual({});
    });

    it('should extract route parameters', () => {
      const { match, params } = matchRoute('/users/:id', '/users/123');
      expect(match).toBe(true);
      expect(params).toEqual({ id: '123' });
    });

    it('should extract multiple route parameters', () => {
      const { match, params } = matchRoute('/users/:userId/posts/:postId', '/users/123/posts/456');
      expect(match).toBe(true);
      expect(params).toEqual({
        userId: '123',
        postId: '456'
      });
    });

    it('should match wildcard routes', () => {
      const { match, params } = matchRoute('/static/*', '/static/images/logo.png');
      expect(match).toBe(true);
      expect(params).toEqual({});
    });

    it('should not match partial routes', () => {
      const { match } = matchRoute('/users', '/users/123');
      expect(match).toBe(false);
    });
  });
});
