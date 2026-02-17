import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backupToServer,
  buildServerPayload,
  canUseCloudBackupAuth,
  getCloudAuthStatus,
  restoreFromServer,
} from './serverStorage';

const VALID_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('serverStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('buildServerPayload includes budget and trends from localStorage', () => {
    localStorage.setItem('subgrid_budget', JSON.stringify({ amount: 250, currency: 'USD' }));
    localStorage.setItem('subgrid_history', JSON.stringify([{ month: '2026-02', total: 99 }]));

    const payload = buildServerPayload({
      subscriptions: [{ id: 'sub-1' }],
      financeRecords: [{ id: 'rec-1' }],
      income: 1000,
    });

    expect(payload.subscriptions).toHaveLength(1);
    expect(payload.financeRecords).toHaveLength(1);
    expect(payload.income).toBe(1000);
    expect(payload.budget).toEqual({ amount: 250, currency: 'USD' });
    expect(payload.trends).toEqual([{ month: '2026-02', total: 99 }]);
  });

  it('backupToServer falls back to R2 when DB endpoint is unavailable', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'D1 database binding not configured' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, backupDate: '2026-02-17T00:00:00.000Z' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await backupToServer(VALID_TOKEN, { subscriptions: [] });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/db/backup');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/r2/backup');
    expect(result.storage).toBe('r2');
  });

  it('restoreFromServer prefers DB endpoint when available', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        subscriptions: [{ id: 's-1' }],
        financeRecords: [{ id: 'r-1' }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await restoreFromServer(VALID_TOKEN);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/db/backup', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        'X-User-Token': VALID_TOKEN,
      }),
    }));
    expect(result.subscriptions).toHaveLength(1);
  });

  it('backupToServer supports Cloudflare Access mode without token header', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, backupDate: '2026-02-17T00:00:00.000Z' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    await backupToServer('', { subscriptions: [] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/db/backup', expect.objectContaining({
      method: 'POST',
      headers: expect.not.objectContaining({
        'X-User-Token': expect.any(String),
      }),
    }));
  });

  it('getCloudAuthStatus returns authenticated user details from API', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        authenticated: true,
        source: 'cloudflare-access',
        email: 'user@example.com',
        userId: 'abc123',
        loginUrl: '/cdn-cgi/access/login',
        logoutUrl: '/cdn-cgi/access/logout',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const status = await getCloudAuthStatus({ force: true });
    expect(status.authenticated).toBe(true);
    expect(status.email).toBe('user@example.com');
    expect(canUseCloudBackupAuth('', status)).toBe(true);
  });

  it('backupToServer rejects invalid token format when provided', async () => {
    await expect(backupToServer('invalid-token', { subscriptions: [] }))
      .rejects
      .toThrow('Token must be a 64-character hexadecimal string');
  });
});
