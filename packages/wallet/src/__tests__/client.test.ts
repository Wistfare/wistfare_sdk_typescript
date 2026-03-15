import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletClient } from '../client.js';
import type { Wistfare } from '@wistfare/core';

function createMockClient() {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as Wistfare & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

describe('WalletClient', () => {
  let mock: ReturnType<typeof createMockClient>;
  let wallet: WalletClient;

  beforeEach(() => {
    mock = createMockClient();
    wallet = new WalletClient(mock);
  });

  // ── Wallets ──

  it('create calls post with correct path and body', async () => {
    const params = { userId: 'u_1', walletType: 'personal' as const };
    await wallet.create(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/wallets', params);
  });

  it('get calls get with correct path', async () => {
    await wallet.get('w_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/wallets/w_1');
  });

  it('getByOwner calls get with correct path and query', async () => {
    await wallet.getByOwner('u_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/wallets/by-owner', { user_id: 'u_1' });
  });

  it('getBalance calls get with correct path', async () => {
    await wallet.getBalance('w_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/wallets/w_1/balance');
  });

  // ── Transfers ──

  it('transfer calls post with correct path and body', async () => {
    const params = { fromWalletId: 'w_1', toWalletId: 'w_2', amount: '1000', idempotencyKey: 'k_1' };
    await wallet.transfer(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/wallets/transfers', params);
  });

  it('listTransactions calls get with correct path', async () => {
    await wallet.listTransactions('w_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/wallets/w_1/transactions', undefined);
  });

  it('listTransactions passes pagination', async () => {
    await wallet.listTransactions('w_1', { page: 2, perPage: 25 });
    expect(mock.get).toHaveBeenCalledWith('/v1/wallets/w_1/transactions', { page: 2, perPage: 25 });
  });

  // ── Deposits & Withdrawals ──

  it('initiateDeposit calls post with correct path and body', async () => {
    const params = { walletId: 'w_1', amount: '5000', paymentMethod: 'mtn', phoneNumber: '+250781234567' };
    await wallet.initiateDeposit(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/wallets/deposits', params);
  });

  it('initiateWithdrawal calls post with correct path and body', async () => {
    const params = { walletId: 'w_1', amount: '2000', destinationType: 'mobile_money', destinationRef: '+250781234567' };
    await wallet.initiateWithdrawal(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/wallets/withdrawals', params);
  });

  // ── Wallet Roles ──

  it('createRole calls post with correct path and body', async () => {
    const params = { walletId: 'w_1', name: 'viewer', permissions: ['read'] };
    await wallet.createRole(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/wallets/roles', params);
  });

  it('listRoles calls get with correct path', async () => {
    await wallet.listRoles('w_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/wallets/w_1/roles');
  });

  it('updateRole calls patch with correct path and body', async () => {
    const params = { name: 'editor' };
    await wallet.updateRole('r_1', params);
    expect(mock.patch).toHaveBeenCalledWith('/v1/wallets/roles/r_1', params);
  });

  it('deleteRole calls delete with correct path', async () => {
    await wallet.deleteRole('r_1');
    expect(mock.delete).toHaveBeenCalledWith('/v1/wallets/roles/r_1');
  });

  // ── Wallet Members ──

  it('addMember calls post with correct path and body', async () => {
    const params = { walletId: 'w_1', userId: 'u_2', roleId: 'r_1' };
    await wallet.addMember(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/wallets/members', params);
  });

  it('listMembers calls get with correct path', async () => {
    await wallet.listMembers('w_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/wallets/w_1/members');
  });

  it('updateMemberRole calls patch with correct path and body', async () => {
    await wallet.updateMemberRole('m_1', 'r_2');
    expect(mock.patch).toHaveBeenCalledWith('/v1/wallets/members/m_1', { roleId: 'r_2' });
  });

  it('removeMember calls delete with correct path', async () => {
    await wallet.removeMember('m_1');
    expect(mock.delete).toHaveBeenCalledWith('/v1/wallets/members/m_1');
  });
});
