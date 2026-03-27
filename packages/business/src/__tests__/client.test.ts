import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BusinessClient } from '../client.js';
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

describe('BusinessClient', () => {
  let mock: ReturnType<typeof createMockClient>;
  let business: BusinessClient;

  beforeEach(() => {
    mock = createMockClient();
    business = new BusinessClient(mock);
  });

  it('get calls get with correct path', async () => {
    await business.get('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/businesses/biz_1');
  });

  it('list calls get with correct path', async () => {
    await business.list();
    expect(mock.get).toHaveBeenCalledWith('/v1/businesses', undefined);
  });

  it('list passes businessId and pagination', async () => {
    await business.list({ businessId: 'biz_123', page: 2, perPage: 10 });
    expect(mock.get).toHaveBeenCalledWith('/v1/businesses', { businessId: 'biz_123', page: 2, perPage: 10 });
  });
});
