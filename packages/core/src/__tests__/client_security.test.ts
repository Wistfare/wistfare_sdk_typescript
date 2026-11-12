import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { Wistfare } from '../client.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; vi.useRealTimers(); });

function pendingFetch() {
  const signals: AbortSignal[] = [];
  globalThis.fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
    const signal = init?.signal;
    if (!signal) throw new Error('request has no timeout signal');
    signals.push(signal);
    return new Promise<Response>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Request timed out', 'AbortError')), { once: true });
    });
  });
  return signals;
}

describe('HTTP authentication and timeout invariants', () => {
  it('replaces protected headers case-insensitively rather than joining credentials', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    globalThis.fetch = fetch;
    const client = new Wistfare({ apiKey: 'wf_test_configured', maxRetries: 0 });
    await client.request('POST', '/v1/collections', {
      body: { amount: '500' },
      headers: { 'x-API-key': 'wf_live_caller', 'CONTENT-TYPE': 'text/plain', accept: 'text/plain', 'user-agent': 'caller', 'Wistfare-Version': '2026-11-12', 'Idempotency-Key': 'stable' },
    });
    const request = new Request(String(fetch.mock.calls[0][0]), fetch.mock.calls[0][1]);
    expect(request.headers.get('X-API-Key')).toBe('wf_test_configured');
    expect(request.headers.get('Content-Type')).toBe('application/json');
    expect(request.headers.get('Accept')).toBe('application/json');
    expect(request.headers.get('User-Agent')).toBe('wistfare-node/0.1.0');
    expect(request.headers.get('Idempotency-Key')).toBe('stable');
  });

  it('keeps the generic 30-second default and supports a longer request timeout', async () => {
    vi.useFakeTimers();
    const signals = pendingFetch();
    const client = new Wistfare({ apiKey: 'wf_test_fixture', maxRetries: 0 });
    const defaultResult = client.get('/v1/test').catch(error => error.name);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(signals[0].aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await defaultResult).toBe('AbortError');
    const longResult = client.request('POST', '/v1/collections', { timeout: 210_000 }).catch(error => error.name);
    await vi.advanceTimersByTimeAsync(200_000);
    expect(signals[1].aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await longResult).toBe('AbortError');
  });

  it('rejects invalid timer values before sending any request', async () => {
    globalThis.fetch = vi.fn();
    const client = new Wistfare({ apiKey: 'wf_test_fixture' });
    for (const timeout of [0, -1, NaN, Infinity, 2_147_483_648, 0.5]) {
      await expect(client.request('GET', '/v1/test', { timeout })).rejects.toThrow(RangeError);
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('never sends an API key to an HTTP redirect target', async () => {
    let targetCalls = 0;
    const target = createServer((_request, response) => { targetCalls++; response.end('{}'); });
    const targetURL = await listen(target);
    const redirect = createServer((_request, response) => { response.writeHead(302, { Location: targetURL }); response.end(); });
    const redirectURL = await listen(redirect);
    globalThis.fetch = originalFetch;
    try {
      const client = new Wistfare({ apiKey: 'wf_test_fixture', baseUrl: redirectURL, maxRetries: 0, timeout: 2000 });
      await expect(client.get('/v1/test')).rejects.toThrow();
      expect(targetCalls).toBe(0);
    } finally {
      await Promise.all([close(redirect), close(target)]);
    }
  });
});

function listen(server: Server): Promise<string> {
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('missing test listener');
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}
function close(server: Server): Promise<void> {
  return new Promise(resolve => { server.close(() => resolve()); server.closeAllConnections?.(); });
}
