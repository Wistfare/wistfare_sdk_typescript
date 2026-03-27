import type { Address, ContactInfo } from '@wistfare/core';

/** Business resource. */
export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  businessType: string;
  category: string;
  logoUrl: string;
  coverImageUrl: string;
  address: Address;
  contact: ContactInfo;
  walletId: string;
  isVerified: boolean;
  status: BusinessStatus;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export type BusinessStatus = 'active' | 'pending' | 'suspended' | 'closed';
