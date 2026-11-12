/** Fee configuration for a business. */
export interface FeeConfig {
  id: string;
  businessId: string;
  transactionType: string;
  feeModel: string;
  percentageRate: string;
  flatAmount: string;
  minFee: string;
  maxFee: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payment request (QR codes, payment links). */
export interface PaymentRequest {
  id: string;
  businessId: string;
  walletId: string;
  requestType: string;
  shortCode: string;
  amount: string;
  currency: string;
  description: string;
  referenceId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequestParams {
  businessId: string;
  walletId: string;
  requestType: string;
  amount: string;
  currency?: string;
  referenceId?: string;
  description?: string;
}

/** Collection (mobile money charge). */
export interface InitiateCollectionParams {
  businessId: string;
  walletId?: string;
  customerPhone: string;
  amount: string;
  paymentMethod: string;
  currency?: string;
  description?: string;
  referenceId?: string;
  paymentRequestId?: string;
}

export interface CollectionResponse {
  id: string;
  businessId: string;
  walletId: string;
  customerPhone: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  referenceId: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** Collection list filters. */
export interface ListCollectionsParams {
  businessId?: string;
  referenceId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  perPage?: number;
}

/** Disbursement (payout to mobile money). */
export interface InitiateDisbursementParams {
  businessId: string;
  walletId: string;
  amount: string;
  destinationType: string;
  destinationRef: string;
  currency?: string;
  description?: string;
  referenceId?: string;
}

export interface DisbursementResponse {
  id: string;
  businessId: string;
  walletId: string;
  amount: string;
  currency: string;
  destinationType: string;
  destinationRef: string;
  referenceId: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// ── Webhooks ──

/** Webhook event types sent by Wistfare. */
export type WebhookEvent =
  | 'collection.completed'
  | 'collection.failed'
  | 'disbursement.completed'
  | 'disbursement.failed';

/** Transaction type included in webhook payloads. */
export type WebhookTransactionType = 'collection' | 'disbursement';

/** Payload delivered to your webhook endpoint. */
export interface WebhookPayload {
  /** One of the webhook event types (e.g. `collection.completed`, `payment.failed`). */
  event: WebhookEvent;
  /** Unique Wistfare transaction identifier. */
  transactionId: string;
  /** `collection` or `disbursement`. */
  transactionType: WebhookTransactionType;
  /** Terminal status: `pending`, `completed`, `failed`, or `expired`. */
  status: string;
  /** Original transaction amount. */
  amount: string;
  /** Fee deducted from the transaction. */
  feeAmount: string;
  /** Amount after fees. */
  netAmount: string;
  /** Currency code (e.g. `RWF`). */
  currency: string;
  /** The business wallet involved. */
  businessWalletId: string;
  /** Customer phone number. */
  customerPhone: string;
  /** Customer display name (may be empty). */
  customerName: string;
  /** Payment rail used (e.g. `mtn_momo`, `airtel_money`). */
  paymentMethod: string;
  /** Your original reference ID passed when creating the collection or disbursement. */
  referenceId: string;
  /** Human-readable description. */
  description: string;
  /** Empty on success; contains the error message on failure. */
  failureReason: string;
  /** ISO 8601 timestamp of the event. */
  timestamp: string;
}

/**
 * Legacy JSON decoding only: does not authenticate the sender or validate shape.
 * For dated collection notifications use verifyCollectionWebhook on raw bytes.
 */
export function parseWebhookPayload(body: string | Uint8Array): WebhookPayload {
  const raw = typeof body === 'string' ? body : new TextDecoder().decode(body);
  const parsed = JSON.parse(raw);
  return parsed as WebhookPayload;
}
