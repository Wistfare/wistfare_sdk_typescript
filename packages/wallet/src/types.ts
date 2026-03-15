/** Wallet resource. */
export interface Wallet {
  id: string;
  userId: string;
  walletType: WalletType;
  kycTier: string;
  state: WalletState;
  balance: string;
  currency: string;
  azampayLinked: boolean;
  createdAt: string;
}

export type WalletType = 'personal' | 'business';
export type WalletState = 'active' | 'suspended' | 'closed';

export interface CreateWalletParams {
  userId: string;
  walletType: WalletType;
  currency?: string;
}

/** Balance response. */
export interface Balance {
  walletId: string;
  availableBalance: string;
  pendingBalance: string;
  currency: string;
  asOf: string;
}

/** Transfer between wallets. */
export interface TransferParams {
  fromWalletId: string;
  toWalletId: string;
  amount: string;
  description?: string;
  idempotencyKey: string;
}

export interface TransferResult {
  transactionId: string;
  status: string;
  fromBalance: string;
  toBalance: string;
  amount: string;
  fee: string;
  currency: string;
  createdAt: string;
}

/** Transaction history entry. */
export interface TransactionEntry {
  id: string;
  transactionType: string;
  fromWalletId: string;
  toWalletId: string;
  amount: string;
  fee: string;
  currency: string;
  status: string;
  entryHash: string;
  description: string;
  createdAt: string;
  confirmedAt: string;
}

/** Deposit (fund wallet via mobile money). */
export interface InitiateDepositParams {
  walletId: string;
  amount: string;
  paymentMethod: string;
  phoneNumber: string;
  currency?: string;
}

export interface DepositResult {
  depositId: string;
  status: string;
  paymentUrl: string;
  instructions: string;
}

/** Withdrawal (cash out from wallet). */
export interface InitiateWithdrawalParams {
  walletId: string;
  amount: string;
  destinationType: string;
  destinationRef: string;
  currency?: string;
}

export interface WithdrawalResult {
  withdrawalId: string;
  status: string;
  estimatedArrival: string;
}

/** Wallet role (RBAC for shared wallets). */
export interface WalletRole {
  id: string;
  walletId: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CreateWalletRoleParams {
  walletId: string;
  name: string;
  permissions: string[];
}

/** Wallet member. */
export interface WalletMember {
  id: string;
  walletId: string;
  userId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  grantedBy: string;
  createdAt: string;
}

export interface AddWalletMemberParams {
  walletId: string;
  userId: string;
  roleId: string;
}
