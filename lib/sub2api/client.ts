import 'server-only';

import type {
  Sub2ApiAuthTokens,
  Sub2ApiEnvelope,
  Sub2ApiLoginResult,
  Sub2ApiTwoFactorChallenge,
  Sub2ApiUser,
  WalletAdjustment,
} from './types';

const DEFAULT_BASE_URL = 'http://127.0.0.1:18080';
const REQUEST_TIMEOUT_MS = 10_000;

export class Sub2ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly reason?: string,
  ) {
    super(message);
    this.name = 'Sub2ApiError';
  }
}

function baseUrl() {
  return (process.env.SUB2API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function readEnvelope<T>(response: Response): Promise<T> {
  let envelope: Sub2ApiEnvelope<T> | null = null;

  try {
    envelope = (await response.json()) as Sub2ApiEnvelope<T>;
  } catch {
    throw new Sub2ApiError(`Sub2API returned HTTP ${response.status}`, response.status);
  }

  if (!response.ok || envelope.code !== 0 || envelope.data === undefined) {
    throw new Sub2ApiError(
      envelope.message || `Sub2API returned HTTP ${response.status}`,
      response.status,
      envelope.code,
      envelope.reason,
    );
  }

  return envelope.data;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl()}/api/v1${path}`, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      accept: 'application/json',
      ...init.headers,
    },
  });

  return readEnvelope<T>(response);
}

function jsonRequest(body: unknown): Pick<RequestInit, 'body' | 'headers'> {
  return {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  };
}

export function loginWithPassword(email: string, password: string) {
  return request<Sub2ApiLoginResult>('/auth/login', {
    method: 'POST',
    ...jsonRequest({ email, password }),
  });
}

export function completeTwoFactorLogin(tempToken: string, totpCode: string) {
  return request<Sub2ApiAuthTokens>('/auth/login/2fa', {
    method: 'POST',
    ...jsonRequest({ temp_token: tempToken, totp_code: totpCode }),
  });
}

export function refreshAccessToken(refreshToken: string) {
  return request<Sub2ApiAuthTokens>('/auth/refresh', {
    method: 'POST',
    ...jsonRequest({ refresh_token: refreshToken }),
  });
}

export async function revokeRefreshToken(refreshToken: string) {
  await request<Record<string, unknown>>('/auth/logout', {
    method: 'POST',
    ...jsonRequest({ refresh_token: refreshToken }),
  });
}

export function getCurrentSub2ApiUser(accessToken: string) {
  return request<Sub2ApiUser>('/auth/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

export function adjustWalletBalance(adjustment: WalletAdjustment) {
  const adminKey = process.env.SUB2API_ADMIN_API_KEY;
  if (!adminKey) {
    throw new Sub2ApiError('Sub2API wallet integration is not configured', 503);
  }

  return request<Sub2ApiUser>(`/admin/users/${adjustment.userId}/balance`, {
    method: 'POST',
    body: JSON.stringify({
      balance: adjustment.amount,
      operation: adjustment.operation,
      notes: adjustment.notes,
    }),
    headers: {
      'content-type': 'application/json',
      'x-api-key': adminKey,
      'Idempotency-Key': adjustment.idempotencyKey,
    },
  });
}

export function isTwoFactorChallenge(result: Sub2ApiLoginResult): result is Sub2ApiTwoFactorChallenge {
  return 'requires_2fa' in result && result.requires_2fa === true;
}
