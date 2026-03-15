import type { Wistfare, ListResponse, PaginationParams } from '@wistfare/core';
import type {
  FeeConfig,
  SetFeeConfigParams,
  PaymentRequest,
  CreatePaymentRequestParams,
  PaymentTransaction,
  InitiateCollectionParams,
  CollectionResponse,
  Disbursement,
  InitiateDisbursementParams,
  DisbursementResponse,
  CalculateFeeParams,
  CalculateFeeResult,
  TransactionStatus,
} from './types.js';

/** Wistfare Payments client — collections, disbursements, fees & payment requests. */
export class PaymentsClient {
  private readonly client: Wistfare;

  constructor(client: Wistfare) {
    this.client = client;
  }

  // ── Fee Management ──

  /** Configure fees for a business. */
  async setFeeConfig(params: SetFeeConfigParams): Promise<FeeConfig> {
    return this.client.post('/v1/fees', params);
  }

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

  /** Delete a fee config. */
  async deleteFeeConfig(feeConfigId: string): Promise<void> {
    return this.client.delete(`/v1/fees/${feeConfigId}`);
  }

  /** Calculate fee for a given amount and business. */
  async calculateFee(params: CalculateFeeParams): Promise<CalculateFeeResult> {
    return this.client.post('/v1/fees/calculate', params);
  }

  // ── Payment Requests (QR / Links) ──

  /** Create a payment request (generates QR code or payment link). */
  async createPaymentRequest(params: CreatePaymentRequestParams): Promise<PaymentRequest> {
    return this.client.post('/v1/payment-requests', params);
  }

  /** Get a payment request by ID. */
  async getPaymentRequest(requestId: string): Promise<PaymentRequest> {
    return this.client.get(`/v1/payment-requests/${requestId}`);
  }

  /** List payment requests for a business. */
  async listPaymentRequests(
    businessId: string,
    pagination?: PaginationParams,
  ): Promise<ListResponse<PaymentRequest>> {
    return this.client.get('/v1/payment-requests', { business_id: businessId, ...pagination });
  }

  /** Cancel a payment request. */
  async cancelPaymentRequest(requestId: string): Promise<PaymentRequest> {
    return this.client.post(`/v1/payment-requests/${requestId}/cancel`);
  }

  // ── Collections (charge customer) ──

  /** Initiate a mobile money collection from a customer. */
  async initiateCollection(params: InitiateCollectionParams): Promise<CollectionResponse> {
    return this.client.post('/v1/collections', params);
  }

  // ── Transactions ──

  /** Get a payment transaction by ID. */
  async getTransaction(transactionId: string): Promise<PaymentTransaction> {
    return this.client.get(`/v1/transactions/${transactionId}`);
  }

  /** List payment transactions with optional filters. */
  async listTransactions(
    businessId: string,
    filters?: TransactionFilters & PaginationParams,
  ): Promise<ListResponse<PaymentTransaction>> {
    return this.client.get('/v1/transactions', { business_id: businessId, ...filters });
  }

  // ── Disbursements (pay out to customer) ──

  /** Initiate a disbursement (payout) to a mobile money number. */
  async initiateDisbursement(params: InitiateDisbursementParams): Promise<DisbursementResponse> {
    return this.client.post('/v1/disbursements', params);
  }

  /** Get a disbursement by ID. */
  async getDisbursement(disbursementId: string): Promise<Disbursement> {
    return this.client.get(`/v1/disbursements/${disbursementId}`);
  }

  /** List disbursements for a business. */
  async listDisbursements(
    businessId: string,
    pagination?: PaginationParams,
  ): Promise<ListResponse<Disbursement>> {
    return this.client.get('/v1/disbursements', { business_id: businessId, ...pagination });
  }
}

interface TransactionFilters {
  status?: TransactionStatus;
  fromDate?: string;
  toDate?: string;
  paymentMethod?: string;
}
