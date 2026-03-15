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

  // ── Businesses ──

  it('create calls post with correct path and body', async () => {
    const params = { name: 'My Shop', businessType: 'retail' };
    await business.create(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/businesses', params);
  });

  it('get calls get with correct path', async () => {
    await business.get('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/businesses/biz_1');
  });

  it('listMine calls get with correct path', async () => {
    await business.listMine();
    expect(mock.get).toHaveBeenCalledWith('/v1/businesses/mine', undefined);
  });

  it('listMine passes pagination', async () => {
    await business.listMine({ page: 2, perPage: 10 });
    expect(mock.get).toHaveBeenCalledWith('/v1/businesses/mine', { page: 2, perPage: 10 });
  });

  it('update calls patch with correct path and body', async () => {
    const params = { name: 'Updated Shop' };
    await business.update('biz_1', params);
    expect(mock.patch).toHaveBeenCalledWith('/v1/businesses/biz_1', params);
  });

  // ── Staff ──

  it('assignStaff calls post with correct path and body', async () => {
    const params = { businessId: 'biz_1', userId: 'u_1', role: 'cashier' };
    await business.assignStaff(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/staff', params);
  });

  it('listStaff calls get with correct path and query', async () => {
    await business.listStaff('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/staff', { business_id: 'biz_1' });
  });

  it('listStaff passes pagination', async () => {
    await business.listStaff('biz_1', { page: 1, perPage: 20 });
    expect(mock.get).toHaveBeenCalledWith('/v1/staff', { business_id: 'biz_1', page: 1, perPage: 20 });
  });

  it('updateStaffRole calls patch with correct path and body', async () => {
    await business.updateStaffRole('s_1', 'manager');
    expect(mock.patch).toHaveBeenCalledWith('/v1/staff/s_1/role', { role: 'manager' });
  });

  it('removeStaff calls delete with correct path', async () => {
    await business.removeStaff('s_1');
    expect(mock.delete).toHaveBeenCalledWith('/v1/staff/s_1');
  });

  // ── Invitations ──

  it('inviteStaff calls post with correct path and body', async () => {
    const params = { businessId: 'biz_1', email: 'test@example.com', role: 'cashier' };
    await business.inviteStaff(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/invitations', params);
  });

  it('listInvitations calls get with correct path and query', async () => {
    await business.listInvitations('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/invitations', { business_id: 'biz_1' });
  });

  it('acceptInvitation calls post with correct path and body', async () => {
    await business.acceptInvitation('tok_abc');
    expect(mock.post).toHaveBeenCalledWith('/v1/invitations/accept', { token: 'tok_abc' });
  });

  it('revokeInvitation calls delete with correct path', async () => {
    await business.revokeInvitation('inv_1');
    expect(mock.delete).toHaveBeenCalledWith('/v1/invitations/inv_1');
  });

  // ── Teams ──

  it('createTeam calls post with correct path and body', async () => {
    const params = { businessId: 'biz_1', name: 'Sales' };
    await business.createTeam(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/teams', params);
  });

  it('listTeams calls get with correct path and query', async () => {
    await business.listTeams('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/teams', { business_id: 'biz_1' });
  });

  it('updateTeam calls patch with correct path and body', async () => {
    const params = { name: 'Marketing' };
    await business.updateTeam('t_1', params);
    expect(mock.patch).toHaveBeenCalledWith('/v1/teams/t_1', params);
  });

  it('deleteTeam calls delete with correct path', async () => {
    await business.deleteTeam('t_1');
    expect(mock.delete).toHaveBeenCalledWith('/v1/teams/t_1');
  });

  it('addTeamMember calls post with correct path and body', async () => {
    await business.addTeamMember('t_1', 'u_1', 'member');
    expect(mock.post).toHaveBeenCalledWith('/v1/teams/t_1/members', { userId: 'u_1', role: 'member' });
  });

  it('removeTeamMember calls delete with correct path', async () => {
    await business.removeTeamMember('t_1', 'u_1');
    expect(mock.delete).toHaveBeenCalledWith('/v1/teams/t_1/members/u_1');
  });

  // ── API Keys ──

  it('createAPIKey calls post with correct path and body', async () => {
    const params = { businessId: 'biz_1', name: 'Production Key', environment: 'live' as const };
    await business.createAPIKey(params);
    expect(mock.post).toHaveBeenCalledWith('/v1/api-keys', params);
  });

  it('listAPIKeys calls get with correct path and query', async () => {
    await business.listAPIKeys('biz_1');
    expect(mock.get).toHaveBeenCalledWith('/v1/api-keys', { business_id: 'biz_1' });
  });

  it('revokeAPIKey calls delete with correct path', async () => {
    await business.revokeAPIKey('key_1');
    expect(mock.delete).toHaveBeenCalledWith('/v1/api-keys/key_1');
  });
});
