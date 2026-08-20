import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { ACCESS_COOKIE, readCookie, REFRESH_COOKIE } from '@/lib/sub2api/cookies';

mock.module('server-only', () => ({}));

let client: typeof import('@/lib/sub2api/client');
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  client = await import('@/lib/sub2api/client');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SUB2API_ADMIN_API_KEY;
  delete process.env.SUB2API_BASE_URL;
});

describe('Sub2API cookie boundary', () => {
  test('reads only the requested cookie', () => {
    const header = `${ACCESS_COOKIE}=access-token; other=value; ${REFRESH_COOKIE}=refresh%20token`;
    expect(readCookie(header, ACCESS_COOKIE)).toBe('access-token');
    expect(readCookie(header, REFRESH_COOKIE)).toBe('refresh token');
    expect(readCookie(header, 'missing')).toBeNull();
  });
});

describe('Sub2API transport contract', () => {
  test('normalizes the auth envelope and bearer header', async () => {
    process.env.SUB2API_BASE_URL = 'https://sub2api.example';
    let request: Request | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return Response.json({
        code: 0,
        message: 'success',
        data: {
          id: 17,
          username: 'researcher',
          email: 'researcher@example.com',
          role: 'user',
          balance: 12.5,
          status: 'active',
          created_at: '2026-08-18T00:00:00Z',
          updated_at: '2026-08-18T00:00:00Z',
        },
      });
    }) as unknown as typeof fetch;

    const user = await client.getCurrentSub2ApiUser('opaque-token');

    expect(user.id).toBe(17);
    expect(user.balance).toBe(12.5);
    expect(request?.url).toBe('https://sub2api.example/api/v1/auth/me');
    expect(request?.headers.get('authorization')).toBe('Bearer opaque-token');
  });

  test('sends an idempotent wallet subtraction without exposing the admin key in the body', async () => {
    process.env.SUB2API_BASE_URL = 'https://sub2api.example/';
    process.env.SUB2API_ADMIN_API_KEY = 'admin-secret';
    let request: Request | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return Response.json({
        code: 0,
        message: 'success',
        data: {
          id: 17,
          username: 'researcher',
          email: 'researcher@example.com',
          role: 'user',
          balance: 11.5,
          status: 'active',
          created_at: '2026-08-18T00:00:00Z',
          updated_at: '2026-08-18T00:00:00Z',
        },
      });
    }) as unknown as typeof fetch;

    await client.adjustWalletBalance({
      userId: 17,
      amount: 1,
      operation: 'subtract',
      idempotencyKey: 'paper-download:order-1:debit',
      notes: 'paper download order order-1',
    });

    const body = await request?.json();
    expect(request?.url).toBe('https://sub2api.example/api/v1/admin/users/17/balance');
    expect(request?.headers.get('x-api-key')).toBe('admin-secret');
    expect(request?.headers.get('idempotency-key')).toBe('paper-download:order-1:debit');
    expect(body).toEqual({ balance: 1, operation: 'subtract', notes: 'paper download order order-1' });
    expect(JSON.stringify(body)).not.toContain('admin-secret');
  });

  test('preserves upstream status and reason on failures', async () => {
    process.env.SUB2API_BASE_URL = 'https://sub2api.example';
    process.env.SUB2API_ADMIN_API_KEY = 'admin-secret';
    globalThis.fetch = mock(async () =>
      Response.json(
        { code: 400, message: 'Insufficient balance', reason: 'INSUFFICIENT_BALANCE' },
        { status: 400 },
      ),
    ) as unknown as typeof fetch;

    await expect(
      client.adjustWalletBalance({
        userId: 17,
        amount: 1,
        operation: 'subtract',
        idempotencyKey: 'paper-download:order-2:debit',
        notes: 'paper download order order-2',
      }),
    ).rejects.toMatchObject({ status: 400, reason: 'INSUFFICIENT_BALANCE' });
  });
});
