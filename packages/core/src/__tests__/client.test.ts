import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Wistfare } from '../client.js';
import {
  WistfareError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  InternalError,
} from '../errors.js';

function mockFetchResponse(status: number, body?: unknown, headers?: Record<string, string>) {
  const headersMap = new Map(Object.entries(headers ?? {}));
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'MockStatus',
    json: body !== undefined ? () => Promise.resolve(body) : () => Promise.reject(new Error('no body')),
    headers: {
      get: (key: string) => headersMap.get(key.toLowerCase()) ?? null,
    },
  });
}

describe('Wistfare client', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ── Constructor ──

  describe('constructor', () => {
    it('throws WistfareError when API key is empty', () => {
      expect(() => new Wistfare({ apiKey: '' })).toThrow(WistfareError);
    });

    it('creates client with valid API key', () => {
      const client = new Wistfare({ apiKey: 'wf_test_abc' });
      expect((client as unknown as { apiKey: string }).apiKey).toBe('wf_test_abc');
    });
  });

  // ── isTestMode ──

  describe('isTestMode', () => {
    it('returns true for wf_test_ keys', () => {
      const client = new Wistfare({ apiKey: 'wf_test_abc123' });
      expect(client.isTestMode).toBe(true);
    });

    it('returns false for wf_live_ keys', () => {
      const client = new Wistfare({ apiKey: 'wf_live_abc123' });
      expect(client.isTestMode).toBe(false);
    });
  });

  // ── baseUrl ──

  describe('baseUrl', () => {
    it('strips trailing slashes', () => {
      const client = new Wistfare({ apiKey: 'wf_test_x', baseUrl: 'https://api.example.com///' });
      expect(client.baseUrl).toBe('https://api.example.com');
    });

    it('defaults to https://api-production.wistfare.com', () => {
      const client = new Wistfare({ apiKey: 'wf_test_x' });
      expect(client.baseUrl).toBe('https://api-production.wistfare.com');
    });
  });

  // ── request method ──

  describe('request', () => {
    let client: Wistfare;

    beforeEach(() => {
      client = new Wistfare({
        apiKey: 'wf_test_key123',
        baseUrl: 'https://api.test.com',
        maxRetries: 0,
      });
    });

    it('builds correct URL with query params', async () => {
      const fetchMock = mockFetchResponse(200, { ok: true });
      globalThis.fetch = fetchMock;

      await client.request('GET', '/v1/items', { query: { page: 1, status: 'active' } });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('https://api.test.com/v1/items?');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('status=active');
    });

    it('sends correct headers', async () => {
      const fetchMock = mockFetchResponse(200, { ok: true });
      globalThis.fetch = fetchMock;

      await client.request('GET', '/v1/test');

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      const headers = new Headers(init.headers);
      expect(headers.get('X-API-Key')).toBe('wf_test_key123');
      expect(headers.get('User-Agent')).toBe('wistfare-node/0.1.0');
      expect(headers.get('Accept')).toBe('application/json');
    });

    it('sets Content-Type when body is provided', async () => {
      const fetchMock = mockFetchResponse(200, { created: true });
      globalThis.fetch = fetchMock;

      await client.request('POST', '/v1/items', { body: { name: 'test' } });

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      const headers = new Headers(init.headers);
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(init.body).toBe(JSON.stringify({ name: 'test' }));
    });

    it('handles 200 responses correctly', async () => {
      globalThis.fetch = mockFetchResponse(200, { id: '123', name: 'Test' });

      const result = await client.request<{ id: string; name: string }>('GET', '/v1/test');
      expect(result).toEqual({ id: '123', name: 'Test' });
    });

    it('handles 204 responses returning undefined', async () => {
      globalThis.fetch = mockFetchResponse(204);

      const result = await client.request('DELETE', '/v1/items/123');
      expect(result).toBeUndefined();
    });

    // ── Error mapping ──

    it('maps 401 to AuthenticationError', async () => {
      globalThis.fetch = mockFetchResponse(401, { error: { code: 'auth', message: 'Unauthorized' } });

      await expect(client.request('GET', '/v1/test')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('maps 403 to PermissionError', async () => {
      globalThis.fetch = mockFetchResponse(403, { error: { code: 'perm', message: 'Forbidden' } });

      await expect(client.request('GET', '/v1/test')).rejects.toBeInstanceOf(PermissionError);
    });

    it('maps 404 to NotFoundError', async () => {
      globalThis.fetch = mockFetchResponse(404, { error: { code: 'nf', message: 'Not found' } });

      await expect(client.request('GET', '/v1/test')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('maps 400 to ValidationError', async () => {
      globalThis.fetch = mockFetchResponse(400, {
        error: { code: 'validation', message: 'Bad request', details: { name: ['required'] } },
      });

      await expect(client.request('GET', '/v1/test')).rejects.toBeInstanceOf(ValidationError);
    });

    it('maps 429 to RateLimitError when retries exhausted', async () => {
      globalThis.fetch = mockFetchResponse(429, { error: { code: 'rate', message: 'Too many' } }, {
        'retry-after': '1',
      });

      await expect(client.request('GET', '/v1/test')).rejects.toBeInstanceOf(RateLimitError);
    });
  });

  // ── Retry logic ──

  describe('retry logic', () => {
    it('retries on 500 errors up to maxRetries', async () => {
      const client = new Wistfare({
        apiKey: 'wf_test_key',
        baseUrl: 'https://api.test.com',
        maxRetries: 2,
      });

      let callCount = 0;
      const headersMap = new Map<string, string>();
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ error: { code: 'internal', message: 'Server error' } }),
            headers: { get: (k: string) => headersMap.get(k) ?? null },
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
          headers: { get: (k: string) => headersMap.get(k) ?? null },
        });
      });

      const result = await client.request('GET', '/v1/test');
      expect(result).toEqual({ success: true });
      expect(callCount).toBe(3); // initial + 2 retries
    });

    it('retries with retry-after header on 429', async () => {
      const client = new Wistfare({
        apiKey: 'wf_test_key',
        baseUrl: 'https://api.test.com',
        maxRetries: 1,
      });

      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            json: () => Promise.resolve({ error: { code: 'rate', message: 'slow down' } }),
            headers: { get: (k: string) => k.toLowerCase() === 'retry-after' ? '0' : null },
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true }),
          headers: { get: () => null },
        });
      });

      const result = await client.request('GET', '/v1/test');
      expect(result).toEqual({ ok: true });
      expect(callCount).toBe(2);
    });
  });

  // ── Convenience methods ──

  describe('convenience methods', () => {
    let client: Wistfare;

    beforeEach(() => {
      client = new Wistfare({ apiKey: 'wf_test_k', baseUrl: 'https://api.test.com', maxRetries: 0 });
      globalThis.fetch = mockFetchResponse(200, { id: '1' });
    });

    it('get sends GET request', async () => {
      await client.get('/v1/items', { page: 1 });
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v1/items');
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('GET');
    });

    it('post sends POST request with body', async () => {
      await client.post('/v1/items', { name: 'x' });
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ name: 'x' }));
    });

    it('patch sends PATCH request', async () => {
      await client.patch('/v1/items/1', { name: 'y' });
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('PATCH');
    });

    it('delete sends DELETE request', async () => {
      await client.delete('/v1/items/1');
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('DELETE');
    });
  });
});
