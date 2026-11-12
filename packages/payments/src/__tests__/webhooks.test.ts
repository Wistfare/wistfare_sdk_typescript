import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyCollectionWebhook, WebhookVerificationError } from '../webhooks.js';

const secret = '0123456789abcdef'.repeat(4);
const id = 'a3ffa096-23a3-4fcc-9bef-d3cebf4998cd';
const eventID = 'c04874ff-6ab8-4c7a-9d97-0d7a601962bb';
const now = Date.parse('2026-11-12T12:00:00Z');
const data = {
  id, walletId: id, merchantReference: 'invoice-42', paymentMethod: 'card', environment: 'test', status: 'completed', version: 3,
  amount: '1.00', currency: 'USD', amountCharged: '1.00', feeAmount: '0.05', netAmount: '0.95', reserveAmount: '0.00', availableAmount: '0.95',
  nextAction: null, failure: null, createdAt: '2026-11-12T11:59:00Z', updatedAt: '2026-11-12T12:00:00Z', completedAt: '2026-11-12T11:59:55Z',
};
const envelope = { id: eventID, type: 'collection.completed', apiVersion: '2026-11-12', createdAt: '2026-11-12T12:00:00Z', data };
const body = JSON.stringify(envelope);
function signed(raw: string | Uint8Array, key = secret, ts = Math.floor(now / 1000).toString()) {
  return {
    'X-Wistfare-Timestamp': ts,
    'X-Wistfare-Delivery-ID': id,
    'X-Wistfare-Signature': `v1=${createHmac('sha256', key).update(`${ts}.${id}.`).update(raw).digest('hex')}`,
  };
}
describe('Authenticated raw webhook parsing', () => {
  it('verifies a full canonical snapshot and preserves exact decimal strings', () => {
    const event = verifyCollectionWebhook(Buffer.from(body), signed(body), secret, { now, expectedWalletId: id, expectedEnvironment: 'test' });
    expect(event).toEqual(envelope);
    expect(event.data).not.toHaveProperty('payer');
  });
  it('accepts comma-separated signatures during rotation for either installed secret', () => {
    const headers = signed(body);
    headers['X-Wistfare-Signature'] += `,${signed(body, 'new-secret')['X-Wistfare-Signature']}`;
    for (const key of [secret, 'new-secret']) expect(verifyCollectionWebhook(body, headers, key, { now }).id).toBe(eventID);
  });
  it('rejects altered bytes, identifiers, timestamps, wrong keys and mismatched scopes', () => {
    const h = signed(body);
    for (const [raw, headers, key, options] of [
      [body + ' ', h, secret, { now }],
      [body, { ...h, 'X-Wistfare-Delivery-ID': eventID }, secret, { now }],
      [body, h, 'wrong-key', { now }],
      [body, h, secret, { now: now + 301_000 }],
      [body, signed(body, secret, String(now / 1000 + 301)), secret, { now }],
      [body, h, secret, { now, expectedEnvironment: 'live' as const }],
      [body, h, secret, { now, expectedWalletId: eventID }],
      [body, h, secret, { now, toleranceSeconds: 0 }],
    ] as const) expect(() => verifyCollectionWebhook(raw, headers, key, options)).toThrow(WebhookVerificationError);
  });
  it('rejects ambiguous headers and malformed signatures without throwing a crypto length error', () => {
    const h = signed(body);
    expect(() => verifyCollectionWebhook(body, { ...h, 'x-wistfare-timestamp': h['X-Wistfare-Timestamp'] }, secret, { now })).toThrow(WebhookVerificationError);
    expect(() => verifyCollectionWebhook(body, { ...h, 'X-Wistfare-Signature': 'v1=00' }, secret, { now })).toThrow(WebhookVerificationError);
    expect(() => verifyCollectionWebhook(body, { ...h, 'X-Wistfare-Timestamp': [h['X-Wistfare-Timestamp'], h['X-Wistfare-Timestamp']] }, secret, { now })).toThrow(WebhookVerificationError);
  });
  it('validates the event type/status and version even with an authentic signature', () => {
    for (const value of [
      { ...envelope, apiVersion: 'wrong' },
      { ...envelope, type: 'collection.failed' },
      { ...envelope, data: { ...data, version: 0 } },
      { ...envelope, data: { ...data, environment: ['test'] } },
      { ...envelope, data: { ...data, paymentMethod: ['mtn_momo'], currency: 'RWF' } },
      { ...envelope, data: { ...data, environment: { toString: null } } },
      { ...envelope, data: { ...data, feeAmount: 0.05 } },
      { ...envelope, data: { ...data, amountCharged: undefined } },
    ]) {
      const raw = JSON.stringify(value);
      expect(() => verifyCollectionWebhook(raw, signed(raw), secret, { now })).toThrow(WebhookVerificationError);
    }
  });
  it('authenticates endpoint challenges before they are echoed', () => {
    const challenge = { ...envelope, type: 'webhook.endpoint_verification', data: { challenge: 'ab'.repeat(32), endpointId: id } };
    const raw = JSON.stringify(challenge);
    expect(verifyCollectionWebhook(raw, signed(raw), secret, { now, expectedEndpointId: id })).toEqual(challenge);
    expect(() => verifyCollectionWebhook(raw, signed(raw), secret, { now, expectedEndpointId: eventID })).toThrow(WebhookVerificationError);
  });
});
