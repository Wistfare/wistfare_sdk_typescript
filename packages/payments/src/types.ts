/** Fee configuration for a business. */
export interface FeeConfig {
  id: string;
  businessId: string;
  transactionType: TransactionType;
  feeModel: FeeModel;
  percentageRate: string;
  flatAmount: string;
  minFee: string;
  maxFee: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'collection' | 'disbursement';
export type FeeModel = 'percentage' | 'flat' | 'percentage_plus_flat';

export interface SetFeeConfigParams {
  businessId: string;
  transactionType: TransactionType;
  feeModel: FeeModel;
  percentageRate?: string;
  flatAmount?: string;
  minFee?: string;
  maxFee?: string;
  currency?: string;
}

/** Payment request (QR codes, payment links). */
export interface PaymentRequest {
  id: string;
  businessId: string;
  walletId: string;
  requestType: PaymentRequestType;
  shortCode: string;
  amount: string;
  currency: string;
  description: string;
  customerPhone: string;
  customerName: string;
  status: PaymentRequestStatus;
  qrData: string;
  maxUses: number;
  useCount: number;
  expiresAt: string;
  createdAt: string;
}

export type PaymentRequestType = 'one_time' | 'recurring' | 'open_amount';
export type PaymentRequestStatus = 'active' | 'completed' | 'expired' | 'cancelled';

export interface CreatePaymentRequestParams {
  businessId: string;
  walletId: string;
  requestType: PaymentRequestType;
  amount: string;
  currency?: string;
  description?: string;
  customerPhone?: string;
  customerName?: string;
  maxUses?: number;
  expiresAt?: string;
}

/** Payment transaction. */
export interface PaymentTransaction {
  id: string;
  paymentRequestId: string;
  businessId: string;
  businessWalletId: string;
  customerPhone: string;
  customerName: string;
  amount: string;
  feeAmount: string;
  netAmount: string;
  currency: string;
  paymentMethod: string;
  status: TransactionStatus;
  azampayReference: string;
  externalId: string;
  description: string;
  failureReason: string;
  createdAt: string;
  confirmedAt: string;
}

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

/** Collection (mobile money charge). */
export interface InitiateCollectionParams {
  businessId: string;
  walletId: string;
  customerPhone: string;
  amount: string;
  paymentMethod: string;
  currency?: string;
  description?: string;
  externalId?: string;
}

export interface CollectionResponse {
  transactionId: string;
  status: TransactionStatus;
  azampayReference: string;
  feeAmount: string;
  netAmount: string;
  message: string;
}

/** Disbursement (payout to mobile money). */
export interface Disbursement {
  id: string;
  businessId: string;
  walletId: string;
  amount: string;
  feeAmount: string;
  netAmount: string;
  currency: string;
  destinationType: string;
  destinationRef: string;
  destinationName: string;
  status: TransactionStatus;
  azampayReference: string;
  externalId: string;
  description: string;
  failureReason: string;
  idempotencyKey: string;
  createdAt: string;
  confirmedAt: string;
}

export interface InitiateDisbursementParams {
  businessId: string;
  walletId: string;
  amount: string;
  destinationType: string;
  destinationRef: string;
  destinationName?: string;
  currency?: string;
  description?: string;
  idempotencyKey: string;
}

export interface DisbursementResponse {
  disbursementId: string;
  status: TransactionStatus;
  feeAmount: string;
  netAmount: string;
  estimatedArrival: string;
}

/** Fee calculation result. */
export interface CalculateFeeResult {
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  feeModel: FeeModel;
  percentageRate: string;
  flatAmount: string;
  currency: string;
}

export interface CalculateFeeParams {
  businessId: string;
  amount: string;
  transactionType: TransactionType;
  currency?: string;
}
