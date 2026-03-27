import type { Wistfare, ListResponse, PaginationParams } from '@wistfare/core';
import type { Business } from './types.js';

/** Wistfare Business client — query business details. */
export class BusinessClient {
  private readonly client: Wistfare;

  constructor(client: Wistfare) {
    this.client = client;
  }

  /** Get a business by ID. */
  async get(businessId: string): Promise<Business> {
    return this.client.get(`/v1/businesses/${businessId}`);
  }

  /** List businesses, optionally filtered by business ID. */
  async list(params?: { businessId?: string } & PaginationParams): Promise<ListResponse<Business>> {
    return this.client.get('/v1/businesses', params ? { ...params } : undefined);
  }
}
