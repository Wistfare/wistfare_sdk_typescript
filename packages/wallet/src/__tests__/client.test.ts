import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletClient } from '../client.js';
import type { Wistfare } from '@wistfare/core';

function createMockClient() {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
  } as unknown as Wistfare & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
}

describe('WalletClient', () => {
  let mock: ReturnType<typeof createMockClient>;
  let wallet: WalletClient;

  beforeEach(() => {
    mock = createMockClient();
    wallet = new WalletClient(mock);
  });

  it('get by walletId calls get with correct params', async () => {
    await wallet.get({ walletId: 'w_1' });
    expect(mock.get).toHaveBeenCalledWith('/v1/wallets', { walletId: 'w_1' });
  });

  it('get by ownerId calls get with correct params', async () => {
    await wallet.get({ ownerId: 'biz_1' });
    expect(mock.get).toHaveBeenCalledWith('/v1/wallets', { ownerId: 'biz_1' });
  });

  it('transfer calls post with correct path and body', async () => {
    const params = {
      fromWalletId: 'w_1',
      toWalletId: 'w_2',
      amount: '1000',
      referenceId: 'ref_1',
    };
    await wallet.transfer(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/wallets/transfers', params);
  });
});
