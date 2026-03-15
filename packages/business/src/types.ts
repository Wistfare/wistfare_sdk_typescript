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

export interface CreateBusinessParams {
  name: string;
  description?: string;
  businessType: string;
  category?: string;
  address?: Address;
  contact?: ContactInfo;
}

export interface UpdateBusinessParams {
  name?: string;
  description?: string;
  category?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  address?: Address;
  contact?: ContactInfo;
}

/** Staff member. */
export interface StaffMember {
  id: string;
  userId: string;
  businessId: string;
  role: string;
  department: string;
  isActive: boolean;
  joinedAt: string;
}

export interface AssignStaffParams {
  businessId: string;
  userId: string;
  role: string;
  department?: string;
}

/** Staff invitation. */
export interface Invitation {
  id: string;
  businessId: string;
  email: string;
  phone: string;
  role: string;
  invitedBy: string;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string;
  createdAt: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface InviteStaffParams {
  businessId: string;
  email?: string;
  phone?: string;
  role: string;
}

/** Team. */
export interface Team {
  id: string;
  businessId: string;
  name: string;
  description: string;
  leadUserId: string;
  roleId: string;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamParams {
  businessId: string;
  name: string;
  description?: string;
  leadUserId?: string;
  roleId?: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: string;
  joinedAt: string;
}

/** API key. */
export interface APIKeyInfo {
  id: string;
  businessId: string;
  name: string;
  environment: 'live' | 'test';
  prefix: string;
  lastFour: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
}

export interface CreateAPIKeyParams {
  businessId: string;
  name: string;
  environment: 'live' | 'test';
}

export interface CreateAPIKeyResult {
  key: APIKeyInfo;
  /** The full API key — only returned once at creation time. */
  rawKey: string;
}
