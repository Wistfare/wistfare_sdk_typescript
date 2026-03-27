import type { Wistfare } from '@wistfare/core';
import type { Wallet, TransferParams, TransferResult } from './types.js';

/** Wistfare Wallet client — wallet details and transfers. */
export class WalletClient {
  private readonly client: Wistfare;

  constructor(client: Wistfare) {
    this.client = client;
  }

  /** Get a wallet by wallet ID or owner ID. */
  async get(params: { walletId?: string; ownerId?: string }): Promise<Wallet> {
    return this.client.get('/v1/wallets', params);
  }

  /** Transfer funds between wallets. */
  async transfer(params: TransferParams): Promise<TransferResult> {
    return this.client.post('/v1/wallets/transfers', params);
  }
}
