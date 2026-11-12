import { createHmac, timingSafeEqual } from 'node:crypto';
import { COLLECTION_API_VERSION } from './collections.js';
import type { Collection, CollectionEnvironment, CollectionEventType } from './collections.js';

interface Envelope { id: string; apiVersion: typeof COLLECTION_API_VERSION; createdAt: string }
export interface CollectionWebhookEvent extends Envelope { type: CollectionEventType; data: Collection }
export interface EndpointVerificationEvent extends Envelope {
  type: 'webhook.endpoint_verification'; data: { challenge: string; endpointId: string };
}
export type VerifiedWebhookEvent = CollectionWebhookEvent | EndpointVerificationEvent;
export type WebhookHeaders = Headers | Record<string, string | string[] | undefined>;
export interface VerifyWebhookOptions {
  /** Clock override for tests, in milliseconds since the Unix epoch. */
  now?: number;
  /** 1–300 seconds; default five minutes. Cannot disable freshness checks. */
  toleranceSeconds?: number;
  expectedWalletId?: string;
  expectedEnvironment?: CollectionEnvironment;
  expectedEndpointId?: string;
}
export class WebhookVerificationError extends Error {
  constructor(message = 'Invalid Wistfare webhook') { super(message); this.name = 'WebhookVerificationError'; }
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const decimal = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;
const statuses = new Set(['processing', 'pending', 'completed', 'failed', 'cancelled', 'expired', 'requires_review']);
const final = new Set(['completed', 'failed', 'cancelled', 'expired', 'requires_review']);
function record(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null && !Array.isArray(v); }
function text(v: unknown): v is string { return typeof v === 'string'; }
function date(v: unknown): v is string { return text(v) && Number.isFinite(Date.parse(v)); }
function nullableMoney(v: unknown): boolean { return v === null || text(v) && decimal.test(v); }
function header(headers: WebhookHeaders, name: string): string {
  if (headers instanceof Headers) return headers.get(name) ?? '';
  const matches = Object.entries(headers).filter(([key]) => key.toLowerCase() === name.toLowerCase());
  if (matches.length !== 1) return '';
  const value = matches[0][1];
  return typeof value === 'string' ? value : Array.isArray(value) && value.length === 1 ? value[0] : '';
}
function collection(v: unknown): v is Collection {
  if (!record(v) || !text(v.id) || !uuid.test(v.id) || !text(v.walletId) || !uuid.test(v.walletId)
    || !text(v.status) || !statuses.has(v.status) || !Number.isSafeInteger(v.version) || Number(v.version) < 1
    || !text(v.amount) || !decimal.test(v.amount) || !text(v.merchantReference)
    || !text(v.environment) || !['test', 'live'].includes(v.environment) || !date(v.createdAt) || !date(v.updatedAt)
    || !(v.completedAt === null || date(v.completedAt))) return false;
  if (!(v.paymentMethod === 'card' && v.currency === 'USD'
    || text(v.paymentMethod) && ['mtn_momo', 'airtel_money'].includes(v.paymentMethod) && v.currency === 'RWF')) return false;
  if (!['amountCharged', 'feeAmount', 'netAmount', 'reserveAmount', 'availableAmount'].every(key => nullableMoney(v[key]))) return false;
  if (!(v.failure === null || record(v.failure) && text(v.failure.code) && text(v.failure.message))) return false;
  if (v.nextAction !== null) {
    if (!record(v.nextAction)) return false;
    if (v.nextAction.type === 'approve_on_phone') { if (v.nextAction.url !== null) return false; }
    else if (v.nextAction.type === 'redirect') {
      if (!text(v.nextAction.url)) return false;
      try { if (new URL(v.nextAction.url).protocol !== 'https:') return false; } catch { return false; }
    } else return false;
  }
  return true;
}

/**
 * Verify the exact raw bytes before parsing. Secret is its returned string value,
 * not hex-decoded bytes. Persist event.id for deduplication; apply data.version
 * monotonically because retries may arrive out of order. This helper does not
 * acknowledge requests, keep an event database, or perform financial side effects.
 */
export function verifyCollectionWebhook(
  body: string | Uint8Array, headers: WebhookHeaders, secret: string, options: VerifyWebhookOptions = {},
): VerifiedWebhookEvent {
  const raw = typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body);
  if (raw.length > 256 * 1024 || !secret) throw new WebhookVerificationError();
  const timestamp = header(headers, 'X-Wistfare-Timestamp');
  const deliveryID = header(headers, 'X-Wistfare-Delivery-ID');
  const signature = header(headers, 'X-Wistfare-Signature');
  const tolerance = options.toleranceSeconds ?? 300;
  const now = Math.floor((options.now ?? Date.now()) / 1000);
  if (!Number.isInteger(tolerance) || tolerance < 1 || tolerance > 300 || !Number.isFinite(now)
    || !/^[0-9]{1,15}$/.test(timestamp) || !uuid.test(deliveryID)
    || !Number.isSafeInteger(Number(timestamp)) || Math.abs(now - Number(timestamp)) > tolerance
    || signature.length > 512) throw new WebhookVerificationError();
  const expected = createHmac('sha256', secret).update(`${timestamp}.${deliveryID}.`).update(raw).digest();
  const valid = signature.split(',').some(value => {
    const match = /^v1=([a-f0-9]{64})$/.exec(value.trim());
    return match !== null && timingSafeEqual(expected, Buffer.from(match[1], 'hex'));
  });
  if (!valid) throw new WebhookVerificationError();
  let event: unknown;
  try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); }
  catch { throw new WebhookVerificationError('Invalid webhook JSON'); }
  if (!record(event) || !text(event.id) || !uuid.test(event.id) || event.apiVersion !== COLLECTION_API_VERSION
    || !date(event.createdAt) || !text(event.type)) throw new WebhookVerificationError('Unsupported webhook envelope');
  if (event.type === 'webhook.endpoint_verification') {
    if (!record(event.data) || !text(event.data.challenge) || !/^[a-f0-9]{64}$/.test(event.data.challenge)
      || !text(event.data.endpointId) || !uuid.test(event.data.endpointId)
      || options.expectedEndpointId !== undefined && event.data.endpointId !== options.expectedEndpointId) {
      throw new WebhookVerificationError('Invalid endpoint verification challenge');
    }
  } else {
    if (!event.type.startsWith('collection.') || !final.has(event.type.slice('collection.'.length))
      || !collection(event.data) || event.type !== `collection.${event.data.status}`
      || options.expectedWalletId !== undefined && event.data.walletId !== options.expectedWalletId
      || options.expectedEnvironment !== undefined && event.data.environment !== options.expectedEnvironment) {
      throw new WebhookVerificationError('Invalid collection event or scope');
    }
  }
  return event as unknown as VerifiedWebhookEvent;
}
