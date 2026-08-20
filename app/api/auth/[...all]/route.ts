import { NextRequest, NextResponse } from 'next/server';
import {
  completeTwoFactorLogin,
  getCurrentSub2ApiUser,
  isTwoFactorChallenge,
  loginWithPassword,
  refreshAccessToken,
  revokeRefreshToken,
  Sub2ApiError,
} from '@/lib/sub2api/client';
import { ACCESS_COOKIE, readCookie, REFRESH_COOKIE } from '@/lib/sub2api/cookies';
import type { Sub2ApiAuthTokens } from '@/lib/sub2api/types';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ all: string[] }> };

function errorResponse(error: unknown) {
  if (error instanceof Sub2ApiError) {
    return NextResponse.json(
      { error: error.message, reason: error.reason },
      { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
    );
  }
  return NextResponse.json({ error: 'Authentication service request failed' }, { status: 502 });
}

function setAuthCookies(response: NextResponse, tokens: Sub2ApiAuthTokens) {
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: tokens.expires_in || 15 * 60,
  });

  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/api/auth',
      maxAge: 30 * 24 * 60 * 60,
    });
  }
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, path: '/api/auth', maxAge: 0 });
}

async function readBody(request: NextRequest) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { all } = await context.params;
  const action = all.join('/');

  if (action !== 'session' && action !== 'get-session' && action !== 'me') {
    return NextResponse.json({ error: 'Unknown authentication endpoint' }, { status: 404 });
  }

  const accessToken = readCookie(request.headers.get('cookie'), ACCESS_COOKIE);
  if (!accessToken) return NextResponse.json(null, { status: 200 });

  try {
    const remoteUser = await getCurrentSub2ApiUser(accessToken);
    const session = {
      session: { id: `sub2api:${remoteUser.id}`, userId: String(remoteUser.id) },
      user: {
        id: String(remoteUser.id),
        name: remoteUser.username || remoteUser.email,
        email: remoteUser.email,
        emailVerified: true,
        image: remoteUser.avatar_url || null,
      },
      wallet: { balance: remoteUser.balance, frozenBalance: remoteUser.frozen_balance || 0 },
    };
    return NextResponse.json(action === 'me' ? remoteUser : session);
  } catch (error) {
    const response = errorResponse(error);
    if (error instanceof Sub2ApiError && error.status === 401) clearAuthCookies(response);
    return response;
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { all } = await context.params;
  const action = all.join('/');
  const body = await readBody(request);

  try {
    if (action === 'login') {
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || !password) {
        return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
      }

      const result = await loginWithPassword(email, password);
      if (isTwoFactorChallenge(result)) return NextResponse.json(result);

      const response = NextResponse.json({ user: result.user });
      setAuthCookies(response, result);
      return response;
    }

    if (action === 'login/2fa') {
      const tempToken = typeof body.temp_token === 'string' ? body.temp_token : '';
      const totpCode = typeof body.totp_code === 'string' ? body.totp_code : '';
      if (!tempToken || !/^\d{6}$/.test(totpCode)) {
        return NextResponse.json({ error: '请输入 6 位验证码' }, { status: 400 });
      }

      const result = await completeTwoFactorLogin(tempToken, totpCode);
      const response = NextResponse.json({ user: result.user });
      setAuthCookies(response, result);
      return response;
    }

    if (action === 'refresh') {
      const refreshToken = readCookie(request.headers.get('cookie'), REFRESH_COOKIE);
      if (!refreshToken) return NextResponse.json({ error: '登录已过期' }, { status: 401 });
      const result = await refreshAccessToken(refreshToken);
      const response = NextResponse.json({ user: result.user });
      setAuthCookies(response, result);
      return response;
    }

    if (action === 'logout' || action === 'sign-out') {
      const refreshToken = readCookie(request.headers.get('cookie'), REFRESH_COOKIE);
      if (refreshToken) {
        try {
          await revokeRefreshToken(refreshToken);
        } catch {
          // Local logout must still complete when token revocation is temporarily unavailable.
        }
      }
      const response = NextResponse.json({ success: true });
      clearAuthCookies(response);
      return response;
    }

    return NextResponse.json({ error: 'Unknown authentication endpoint' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
