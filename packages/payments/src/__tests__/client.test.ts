import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsClient } from '../client.js';
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

describe('PaymentsClient', () => {
  let mock: ReturnType<typeof createMockClient>;
  let payments: PaymentsClient;

  beforeEach(() => {
    mock = createMockClient();
    payments = new PaymentsClient(mock);
  });

  // ── Fee Management ──

  it('setFeeConfig calls post with correct path and body', async () => {
    const params = { businessId: 'biz_1', transactionType: 'collection' as const, feeModel: 'percentage' as const };
    await payments.setFeeConfig(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/fees', params);
  });

  it('getFeeConfig calls get with correct path and query', async () => {
    await payments.getFeeConfig('biz_1', 'collection');
    expect(mock.get).toHaveBeenCalledWith('/v1/fees/biz_1', { transaction_type: 'collection' });
  });

  it('listFeeConfigs calls get with correct path', async () => {
    await payments.listFeeConfigs('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/fees', { business_id: 'biz_1' });
  });

  it('listFeeConfigs passes pagination params', async () => {
    await payments.listFeeConfigs('biz_1', { page: 2, perPage: 10 });
    expect(mock.get).toHaveBeenCalledWith('/v1/fees', { business_id: 'biz_1', page: 2, perPage: 10 });
  });

  it('deleteFeeConfig calls delete with correct path', async () => {
    await payments.deleteFeeConfig('fee_1');
    expect(mock.delete).toHaveBeenCalledWith('/v1/fees/fee_1');
  });

  it('calculateFee calls post with correct path and body', async () => {
    const params = { businessId: 'biz_1', amount: '1000', transactionType: 'collection' as const };
    await payments.calculateFee(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/fees/calculate', params);
  });

  // ── Payment Requests ──

  it('createPaymentRequest calls post correctly', async () => {
    const params = { businessId: 'biz_1', walletId: 'w_1', requestType: 'one_time' as const, amount: '500' };
    await payments.createPaymentRequest(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/payment-requests', params);
  });

  it('getPaymentRequest calls get correctly', async () => {
    await payments.getPaymentRequest('pr_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/payment-requests/pr_1');
  });

  it('listPaymentRequests calls get correctly', async () => {
    await payments.listPaymentRequests('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/payment-requests', { business_id: 'biz_1' });
  });

  it('cancelPaymentRequest calls post correctly', async () => {
    await payments.cancelPaymentRequest('pr_1');
    expect(mock.post).toHaveBeenCalledWith('/v1/payment-requests/pr_1/cancel');
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

  // ── Transactions ──

  it('getTransaction calls get correctly', async () => {
    await payments.getTransaction('txn_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/transactions/txn_1');
  });

  it('listTransactions calls get correctly', async () => {
    await payments.listTransactions('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/transactions', { business_id: 'biz_1' });
  });

  it('listTransactions passes filters', async () => {
    await payments.listTransactions('biz_1', { status: 'completed', page: 1 });
    expect(mock.get).toHaveBeenCalledWith('/v1/transactions', { business_id: 'biz_1', status: 'completed', page: 1 });
  });

  // ── Disbursements ──

  it('initiateDisbursement calls post correctly', async () => {
    const params = {
      businessId: 'biz_1',
      walletId: 'w_1',
      amount: '500',
      destinationType: 'mobile_money',
      destinationRef: '+250781234567',
      idempotencyKey: 'idem_1',
    };
    await payments.initiateDisbursement(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/disbursements', params);
  });

  it('getDisbursement calls get correctly', async () => {
    await payments.getDisbursement('dis_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/disbursements/dis_1');
  });

  it('listDisbursements calls get correctly', async () => {
    await payments.listDisbursements('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/disbursements', { business_id: 'biz_1' });
  });
});
