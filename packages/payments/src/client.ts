import type { Wistfare, ListResponse, PaginationParams } from '@wistfare/core';
import { CollectionsClient, WebhookEndpointsClient } from './collections.js';
import type {
  FeeConfig,
  PaymentRequest,
  CreatePaymentRequestParams,
  InitiateCollectionParams,
  CollectionResponse,
  ListCollectionsParams,
  InitiateDisbursementParams,
  DisbursementResponse,
} from './types.js';

/** Wistfare Payments client — collections, disbursements, fees & payment requests. */
export class PaymentsClient {
  private readonly client: Wistfare;
  readonly collections: CollectionsClient;
  readonly webhookEndpoints: WebhookEndpointsClient;

  constructor(client: Wistfare) {
    this.client = client;
    this.collections = new CollectionsClient(client);
    this.webhookEndpoints = new WebhookEndpointsClient(client);
  }

  // ── Fees ──

  /** Get fee configuration for a business and transaction type. */
  async getFeeConfig(businessId: string, transactionType: string): Promise<FeeConfig> {
    return this.client.get(`/v1/fees/${businessId}`, { transaction_type: transactionType });
  }

  /** List all fee configs for a business. */
  async listFeeConfigs(
    businessId: string,
    pagination?: PaginationParams,
  ): Promise<ListResponse<FeeConfig>> {
    return this.client.get('/v1/fees', { business_id: businessId, ...pagination });
  }

  // ── Collections ──

  /** @deprecated Legacy unversioned API. Use collections.create with an idempotency key. */
  async initiateCollection(params: InitiateCollectionParams): Promise<CollectionResponse> {
    return this.client.post('/v1/collections', params);
  }

  /** @deprecated Legacy unversioned API. Use collections.list. */
  async listCollections(params?: ListCollectionsParams): Promise<ListResponse<CollectionResponse>> {
    return this.client.get('/v1/collections', params ? { ...params } : undefined);
  }

  // ── Payment Requests ──

  /** Create a payment request (generates QR code or payment link). */
  async createPaymentRequest(params: CreatePaymentRequestParams): Promise<PaymentRequest> {
    return this.client.post('/v1/payment-requests', params);
  }

  // ── Disbursements ──

  /** Initiate a disbursement (payout) to a mobile money number. */
  async initiateDisbursement(params: InitiateDisbursementParams): Promise<DisbursementResponse> {
    return this.client.post('/v1/disbursements', params);
  }
}
