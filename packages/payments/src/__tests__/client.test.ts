import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsClient } from '../client.js';
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

describe('PaymentsClient', () => {
  let mock: ReturnType<typeof createMockClient>;
  let payments: PaymentsClient;

  beforeEach(() => {
    mock = createMockClient();
    payments = new PaymentsClient(mock);
  });

  // ── Fees ──

  it('getFeeConfig calls get with correct path and query', async () => {
    await payments.getFeeConfig('biz_1', 'collection');
    expect(mock.get).toHaveBeenCalledWith('/v1/fees/biz_1', { transaction_type: 'collection' });
  });

  it('listFeeConfigs calls get with correct path', async () => {
    await payments.listFeeConfigs('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/fees', { business_id: 'biz_1' });
  });

  it('listFeeConfigs passes pagination', async () => {
    await payments.listFeeConfigs('biz_1', { page: 2, perPage: 10 });
    expect(mock.get).toHaveBeenCalledWith('/v1/fees', { business_id: 'biz_1', page: 2, perPage: 10 });
  });

  // ── Collections ──

  it('initiateCollection calls post correctly', async () => {
    const params = {
      businessId: 'biz_1',
      walletId: 'w_1',
      customerPhone: '+250781234567',
      amount: '1000',
      paymentMethod: 'mtn',
    };
    await payments.initiateCollection(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/collections', params);
  });

  it('listCollections calls get with filters', async () => {
    await payments.listCollections({ businessId: 'biz_1', status: 'completed' });
    expect(mock.get).toHaveBeenCalledWith('/v1/collections', { businessId: 'biz_1', status: 'completed' });
  });

  it('listCollections calls get with no params', async () => {
    await payments.listCollections();
    expect(mock.get).toHaveBeenCalledWith('/v1/collections', undefined);
  });

  // ── Payment Requests ──

  it('createPaymentRequest calls post correctly', async () => {
    const params = { businessId: 'biz_1', walletId: 'w_1', requestType: 'one_time', amount: '500' };
    await payments.createPaymentRequest(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/payment-requests', params);
  });

  // ── Disbursements ──

  it('initiateDisbursement calls post correctly', async () => {
    const params = {
      businessId: 'biz_1',
      walletId: 'w_1',
      amount: '500',
      destinationType: 'mobile_money',
      destinationRef: '+250781234567',
    };
    await payments.initiateDisbursement(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/disbursements', params);
  });
});
