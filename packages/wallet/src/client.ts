import type { Wistfare, ListResponse, PaginationParams } from '@wistfare/core';
import type {
  Wallet,
  CreateWalletParams,
  Balance,
  TransferParams,
  TransferResult,
  TransactionEntry,
  InitiateDepositParams,
  DepositResult,
  InitiateWithdrawalParams,
  WithdrawalResult,
  WalletRole,
  CreateWalletRoleParams,
  WalletMember,
  AddWalletMemberParams,
} from './types.js';

/** Wistfare Wallet client — balances, transfers, deposits & withdrawals. */
export class WalletClient {
  private readonly client: Wistfare;

  constructor(client: Wistfare) {
    this.client = client;
  }

  // ── Wallets ──

  /** Create a new wallet. */
  async create(params: CreateWalletParams): Promise<Wallet> {
    return this.client.post('/v1/wallets', params);
  }

  /** Get a wallet by ID. */
  async get(walletId: string): Promise<Wallet> {
    return this.client.get(`/v1/wallets/${walletId}`);
  }

  /** Get a wallet by owner user ID. */
  async getByOwner(userId: string): Promise<Wallet> {
    return this.client.get('/v1/wallets/by-owner', { user_id: userId });
  }

  /** Get wallet balance. */
  async getBalance(walletId: string): Promise<Balance> {
    return this.client.get(`/v1/wallets/${walletId}/balance`);
  }

  // ── Transfers ──

  /** Transfer funds between wallets. */
  async transfer(params: TransferParams): Promise<TransferResult> {
    return this.client.post('/v1/wallets/transfers', params);
  }

  /** Get transaction history for a wallet. */
  async listTransactions(
    walletId: string,
    pagination?: PaginationParams,
  ): Promise<ListResponse<TransactionEntry>> {
    return this.client.get(`/v1/wallets/${walletId}/transactions`, pagination);
  }

  // ── Deposits & Withdrawals ──

  /** Initiate a deposit (fund wallet via mobile money). */
  async initiateDeposit(params: InitiateDepositParams): Promise<DepositResult> {
    return this.client.post('/v1/wallets/deposits', params);
  }

  /** Initiate a withdrawal (cash out to mobile money). */
  async initiateWithdrawal(params: InitiateWithdrawalParams): Promise<WithdrawalResult> {
    return this.client.post('/v1/wallets/withdrawals', params);
  }

  // ── Wallet Roles (RBAC) ──

  /** Create a role for a shared wallet. */
  async createRole(params: CreateWalletRoleParams): Promise<WalletRole> {
    return this.client.post('/v1/wallets/roles', params);
  }

  /** List roles for a wallet. */
  async listRoles(walletId: string): Promise<ListResponse<WalletRole>> {
    return this.client.get(`/v1/wallets/${walletId}/roles`);
  }

  /** Update a wallet role. */
  async updateRole(roleId: string, params: Partial<CreateWalletRoleParams>): Promise<WalletRole> {
    return this.client.patch(`/v1/wallets/roles/${roleId}`, params);
  }

  /** Delete a wallet role. */
  async deleteRole(roleId: string): Promise<void> {
    return this.client.delete(`/v1/wallets/roles/${roleId}`);
  }

  // ── Wallet Members ──

  /** Add a member to a shared wallet. */
  async addMember(params: AddWalletMemberParams): Promise<WalletMember> {
    return this.client.post('/v1/wallets/members', params);
  }

  /** List members of a wallet. */
  async listMembers(walletId: string): Promise<ListResponse<WalletMember>> {
    return this.client.get(`/v1/wallets/${walletId}/members`);
  }

  /** Update a member's role. */
  async updateMemberRole(memberId: string, roleId: string): Promise<WalletMember> {
    return this.client.patch(`/v1/wallets/members/${memberId}`, { roleId });
  }

  /** Remove a member from a wallet. */
  async removeMember(memberId: string): Promise<void> {
    return this.client.delete(`/v1/wallets/members/${memberId}`);
  }
}
