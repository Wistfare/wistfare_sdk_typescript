import { afterEach, describe, expect, it, vi } from 'vitest';
import { Wistfare } from '@wistfare/core';
import { PaymentsClient } from '../client.js';
import { COLLECTION_API_VERSION } from '../collections.js';

const id = 'a3ffa096-23a3-4fcc-9bef-d3cebf4998cd';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; vi.useRealTimers(); });
function setup() {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id, status: 'processing', feeAmount: null }), { status: 202 }));
  globalThis.fetch = fetch;
  return { fetch, payments: new PaymentsClient(new Wistfare({ apiKey: 'wf_test_fixture', baseUrl: 'https://staging.payments.wistfare.com', maxRetries: 0 })) };
}
describe('Dated unified collections', () => {
  it.each(['mtn_momo', 'airtel_money', 'card'] as const)('uses one endpoint and immutable idempotency for %s', async method => {
    const { fetch, payments } = setup();
    const result = await payments.collections.create(method === 'card'
      ? { walletId: id, paymentMethod: method, amount: '1.00', currency: 'USD', payer: { name: 'Test Payer', email: 'payer@example.com', phone: '250780000001' } }
      : { walletId: id, paymentMethod: method, amount: '500', currency: 'RWF', payer: { phone: '250780000001' } },
    { idempotencyKey: 'invoice:42:attempt:1' });
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://staging.payments.wistfare.com/v1/collections');
    const headers = new Headers(init.headers);
    expect(headers.get('Wistfare-Version')).toBe(COLLECTION_API_VERSION);
    expect(headers.get('Idempotency-Key')).toBe('invoice:42:attempt:1');
    expect(headers.get('X-API-Key')).toBe('wf_test_fixture');
    expect(init.redirect).toBe('error');
    const body = JSON.parse(String(init.body));
    expect(body.paymentMethod).toBe(method);
    expect(body).not.toHaveProperty('businessId');
    expect(body).not.toHaveProperty('environment');
    expect(body).not.toHaveProperty('idempotencyKey');
    expect(result.feeAmount).toBeNull();
  });
  it('rejects missing idempotency and invalid path IDs before sending', async () => {
    const { fetch, payments } = setup();
    await expect(payments.collections.create({ walletId: id, paymentMethod: 'mtn_momo', amount: '500', currency: 'RWF', payer: { phone: '250780000001' } }, { idempotencyKey: '' })).rejects.toThrow('idempotencyKey');
    await expect(payments.collections.get('../../admin')).rejects.toThrow('UUID');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps reads and delivery pagination on the dated contract', async () => {
    const { fetch, payments } = setup();
    await payments.collections.get(id);
    fetch.mockResolvedValue(new Response('{}'));
    await payments.webhookEndpoints.deliveries(id, { limit: 25, before: id, status: 'failed' });
    const [url, init] = fetch.mock.calls[1] as [string, RequestInit];
    expect(new URL(url).searchParams.get('before')).toBe(id);
    expect(new URL(url).searchParams.get('status')).toBe('failed');
    expect(new Headers(init.headers).get('Wistfare-Version')).toBe(COLLECTION_API_VERSION);
  });
  it('never automatically repeats a secret rotation after an ambiguous network result', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('network lost'));
    const payments = new PaymentsClient(new Wistfare({ apiKey: 'wf_test_fixture', maxRetries: 2 }));
    await expect(payments.webhookEndpoints.rotate(id)).rejects.toThrow('network lost');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
  it('retries a collection with identical raw body and idempotency key', async () => {
    vi.useFakeTimers();
    const input = { walletId: id, paymentMethod: 'mtn_momo' as const, amount: '500', currency: 'RWF' as const, payer: { phone: '250780000001' } };
    globalThis.fetch = vi.fn().mockImplementationOnce(() => {
      input.amount = '900';
      throw new TypeError('response lost');
    }).mockResolvedValue(new Response(JSON.stringify({ id })));
    const payments = new PaymentsClient(new Wistfare({ apiKey: 'wf_test_fixture', maxRetries: 1 }));
    const result = payments.collections.create(input, { idempotencyKey: 'stable-key' });
    await vi.runAllTimersAsync();
    await result;
    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]?.body).toBe(calls[1][1]?.body);
    expect(JSON.parse(String(calls[1][1]?.body)).amount).toBe('500');
    for (const call of calls) expect(new Headers(call[1]?.headers).get('Idempotency-Key')).toBe('stable-key');
  });
});

describe('Collection initiation timeout budget', () => {
  it('outlives the server initiation budget even when the generic client timeout is short', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    globalThis.fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Request timed out', 'AbortError')), { once: true });
      });
    });
    const payments = new PaymentsClient(new Wistfare({ apiKey: 'wf_test_fixture', maxRetries: 0, timeout: 1000 }));
    const result = payments.collections.create({
      walletId: id, paymentMethod: 'mtn_momo', amount: '500', currency: 'RWF', payer: { phone: '250780000001' },
    }, { idempotencyKey: 'long-initiation' }).catch(error => error.name);
    await vi.advanceTimersByTimeAsync(200_000);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await result).toBe('AbortError');
  });

  it('permits an explicit per-collection timeout without changing the idempotency key', async () => {
    vi.useFakeTimers();
    const calls: RequestInit[] = [];
    globalThis.fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      calls.push(init!);
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Request timed out', 'AbortError')), { once: true });
      });
    });
    const payments = new PaymentsClient(new Wistfare({ apiKey: 'wf_test_fixture', maxRetries: 0 }));
    const result = payments.collections.create({
      walletId: id, paymentMethod: 'card', amount: '1.00', currency: 'USD', payer: { name: 'Test Payer', email: 'payer@example.com', phone: '250780000001' },
    }, { idempotencyKey: 'explicit-timeout', timeout: 5000 }).catch(error => error.name);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await result).toBe('AbortError');
    expect(calls).toHaveLength(1);
    expect(new Headers(calls[0].headers).get('Idempotency-Key')).toBe('explicit-timeout');
  });
});
