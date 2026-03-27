/** Wallet resource. */
export interface Wallet {
  id: string;
  ownerId: string;
  ownerType: string;
  currency: string;
  balance: string;
  availableBalance: string;
  pendingBalance: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Transfer between wallets. */
export interface TransferParams {
  fromWalletId: string;
  toWalletId: string;
  amount: string;
  description?: string;
  referenceId: string;
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
