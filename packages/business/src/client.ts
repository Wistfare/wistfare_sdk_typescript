import type { Wistfare, ListResponse, PaginationParams } from '@wistfare/core';
import type {
  Business,
  CreateBusinessParams,
  UpdateBusinessParams,
  StaffMember,
  AssignStaffParams,
  Invitation,
  InviteStaffParams,
  Team,
  CreateTeamParams,
  TeamMember,
  APIKeyInfo,
  CreateAPIKeyParams,
  CreateAPIKeyResult,
} from './types.js';

/** Wistfare Business client — manage businesses, staff, teams & API keys. */
export class BusinessClient {
  private readonly client: Wistfare;

  constructor(client: Wistfare) {
    this.client = client;
  }

  // ── Businesses ──

  /** Create a new business. */
  async create(params: CreateBusinessParams): Promise<Business> {
    return this.client.post('/v1/businesses', params);
  }

  /** Get a business by ID. */
  async get(businessId: string): Promise<Business> {
    return this.client.get(`/v1/businesses/${businessId}`);
  }

  /** List businesses owned by the current user. */
  async listMine(pagination?: PaginationParams): Promise<ListResponse<Business>> {
    return this.client.get('/v1/businesses/mine', pagination);
  }

  /** Update a business. */
  async update(businessId: string, params: UpdateBusinessParams): Promise<Business> {
    return this.client.patch(`/v1/businesses/${businessId}`, params);
  }

  // ── Staff ──

  /** Assign a user as staff to a business. */
  async assignStaff(params: AssignStaffParams): Promise<StaffMember> {
    return this.client.post('/v1/staff', params);
  }

  /** List staff members of a business. */
  async listStaff(
    businessId: string,
    pagination?: PaginationParams,
  ): Promise<ListResponse<StaffMember>> {
    return this.client.get('/v1/staff', { business_id: businessId, ...pagination });
  }

  /** Update a staff member's role. */
  async updateStaffRole(staffId: string, role: string): Promise<void> {
    return this.client.patch(`/v1/staff/${staffId}/role`, { role });
  }

  /** Remove a staff member. */
  async removeStaff(staffId: string): Promise<void> {
    return this.client.delete(`/v1/staff/${staffId}`);
  }

  // ── Invitations ──

  /** Invite a user to join a business as staff. */
  async inviteStaff(params: InviteStaffParams): Promise<Invitation> {
    return this.client.post('/v1/invitations', params);
  }

  /** List pending invitations for a business. */
  async listInvitations(
    businessId: string,
    pagination?: PaginationParams,
  ): Promise<ListResponse<Invitation>> {
    return this.client.get('/v1/invitations', { business_id: businessId, ...pagination });
  }

  /** Accept a staff invitation. */
  async acceptInvitation(token: string): Promise<StaffMember> {
    return this.client.post('/v1/invitations/accept', { token });
  }

  /** Revoke a pending invitation. */
  async revokeInvitation(invitationId: string): Promise<void> {
    return this.client.delete(`/v1/invitations/${invitationId}`);
  }

  // ── Teams ──

  /** Create a team within a business. */
  async createTeam(params: CreateTeamParams): Promise<Team> {
    return this.client.post('/v1/teams', params);
  }

  /** List teams in a business. */
  async listTeams(
    businessId: string,
    pagination?: PaginationParams,
  ): Promise<ListResponse<Team>> {
    return this.client.get('/v1/teams', { business_id: businessId, ...pagination });
  }

  /** Update a team. */
  async updateTeam(teamId: string, params: Partial<CreateTeamParams>): Promise<Team> {
    return this.client.patch(`/v1/teams/${teamId}`, params);
  }

  /** Delete a team. */
  async deleteTeam(teamId: string): Promise<void> {
    return this.client.delete(`/v1/teams/${teamId}`);
  }

  /** Add a member to a team. */
  async addTeamMember(teamId: string, userId: string, role?: string): Promise<TeamMember> {
    return this.client.post(`/v1/teams/${teamId}/members`, { userId, role });
  }

  /** Remove a member from a team. */
  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    return this.client.delete(`/v1/teams/${teamId}/members/${userId}`);
  }

  // ── API Keys ──

  /** Create an API key for a business. The raw key is only returned once. */
  async createAPIKey(params: CreateAPIKeyParams): Promise<CreateAPIKeyResult> {
    return this.client.post('/v1/api-keys', params);
  }

  /** List API keys for a business (keys are masked). */
  async listAPIKeys(businessId: string): Promise<ListResponse<APIKeyInfo>> {
    return this.client.get('/v1/api-keys', { business_id: businessId });
  }

  /** Revoke an API key. */
  async revokeAPIKey(apiKeyId: string): Promise<void> {
    return this.client.delete(`/v1/api-keys/${apiKeyId}`);
  }
}
