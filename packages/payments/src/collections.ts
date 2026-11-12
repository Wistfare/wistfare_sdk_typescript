import type { Wistfare } from '@wistfare/core';

export const COLLECTION_API_VERSION = '2026-11-12' as const;
export type CollectionEnvironment = 'test' | 'live';
export type CollectionMethod = 'mtn_momo' | 'airtel_money' | 'card';
export type CollectionStatus = 'processing' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired' | 'requires_review';

interface CollectionInput {
  walletId: string;
  /** Decimal major units; never a JS floating-point number. */
  amount: string;
  merchantReference?: string;
  description?: string;
}
export type CreateCollection = CollectionInput & (
  | { paymentMethod: 'mtn_momo' | 'airtel_money'; currency: 'RWF'; payer: { phone: string; name?: string; email?: string }; returnUrl?: never }
  | { paymentMethod: 'card'; currency: 'USD'; payer: { phone: string; name: string; email: string }; returnUrl?: string }
);

/** The same canonical snapshot is returned by POST, GET and collection events. */
export interface Collection {
  id: string;
  walletId: string;
  merchantReference: string;
  paymentMethod: CollectionMethod;
  environment: CollectionEnvironment;
  status: CollectionStatus;
  version: number;
  amount: string;
  currency: 'RWF' | 'USD';
  /** Null means pricing has not been established, not zero. */
  amountCharged: string | null;
  feeAmount: string | null;
  netAmount: string | null;
  reserveAmount: string | null;
  availableAmount: string | null;
  nextAction: { type: 'redirect'; url: string } | { type: 'approve_on_phone'; url: null } | null;
  failure: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
export interface CollectionFilters {
  walletId?: string;
  status?: CollectionStatus;
  paymentMethod?: CollectionMethod;
  merchantReference?: string;
  page?: number;
  perPage?: number;
}
export interface CollectionPage { data: Collection[]; total: number; page: number; perPage: number }

const versionHeaders = { 'Wistfare-Version': COLLECTION_API_VERSION };
export function resourceID(id: string): string {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
    throw new TypeError('A canonical UUID resource ID is required');
  }
  return id;
}

/** Dated unified collection API. Business and environment come from the wallet key. */
export class CollectionsClient {
  constructor(private readonly client: Wistfare) {}
  async create(input: CreateCollection, options: { idempotencyKey: string; timeout?: number }): Promise<Collection> {
    const key = options?.idempotencyKey;
    if (!key || key.length > 128 || key.trim() !== key || /[\r\n\0]/.test(key)) {
      throw new TypeError('A stable 1–128 character idempotencyKey is required');
    }
    return this.client.request('POST', '/v1/collections', {
      body: input, headers: { ...versionHeaders, 'Idempotency-Key': key },
      // Provider initiation has a 190s budget and the API gateway allows 200s.
      // A shorter generic client timeout must not abort payer lookup by default.
      timeout: options.timeout ?? 210_000,
    });
  }
  async get(id: string): Promise<Collection> {
    return this.client.request('GET', `/v1/collections/${resourceID(id)}`, { headers: versionHeaders });
  }
  async list(filters?: CollectionFilters): Promise<CollectionPage> {
    return this.client.request('GET', '/v1/collections', { headers: versionHeaders, query: { ...filters } });
  }
}

export interface WebhookEndpoint {
  id: string; walletId: string; environment: CollectionEnvironment; url: string;
  status: 'pending' | 'active' | 'disabled'; createdAt: string; updatedAt: string;
  previousValidUntil?: string;
}
/** Returned only by create/rotate. Never log or put this value in a browser. */
export interface WebhookEndpointSecret extends WebhookEndpoint { signingSecret: string }
export type DeliveryStatus = 'pending' | 'inflight' | 'delivered' | 'failed' | 'cancelled';
export type CollectionEventType = `collection.${Exclude<CollectionStatus, 'pending' | 'processing'>}`;
export interface WebhookDelivery {
  id: string; eventId: string; collectionId: string; type: CollectionEventType; version: number;
  status: DeliveryStatus; attempt: number; httpStatus: number | null; lastError?: string;
  createdAt: string; nextAttemptAt: string; deliveredAt?: string;
}
export interface DeliveryFilters { limit?: number; before?: string; status?: DeliveryStatus }
export interface DeliveryPage { data: WebhookDelivery[]; nextCursor?: string }

export class WebhookEndpointsClient {
  constructor(private readonly client: Wistfare) {}
  async create(input: { url: string; walletId?: string }): Promise<WebhookEndpointSecret> {
    return this.client.request('POST', '/v1/webhook-endpoints', { headers: versionHeaders, body: input });
  }
  async list(): Promise<{ data: WebhookEndpoint[] }> {
    return this.client.request('GET', '/v1/webhook-endpoints', { headers: versionHeaders });
  }
  async get(id: string): Promise<WebhookEndpoint> {
    return this.client.request('GET', this.path(id), { headers: versionHeaders });
  }
  async verify(id: string): Promise<WebhookEndpoint> {
    return this.client.request('POST', `${this.path(id)}/verify`, { headers: versionHeaders });
  }
  async rotate(id: string): Promise<WebhookEndpointSecret> {
    return this.client.request('POST', `${this.path(id)}/rotate`, { headers: versionHeaders });
  }
  async disable(id: string): Promise<void> {
    return this.client.request('DELETE', this.path(id), { headers: versionHeaders });
  }
  async deliveries(id: string, filters?: DeliveryFilters): Promise<DeliveryPage> {
    return this.client.request('GET', `${this.path(id)}/deliveries`, { headers: versionHeaders, query: { ...filters } });
  }
  async replay(id: string, deliveryID: string): Promise<{ status: 'pending' }> {
    return this.client.request('POST', `${this.path(id)}/deliveries/${resourceID(deliveryID)}/replay`, { headers: versionHeaders });
  }
  private path(id: string): string { return `/v1/webhook-endpoints/${resourceID(id)}`; }
}
