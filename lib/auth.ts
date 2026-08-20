import 'server-only';

import DodoPayments from 'dodopayments';
import { eq } from 'drizzle-orm';
import { maindb } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { ACCESS_COOKIE, readCookie } from '@/lib/sub2api/cookies';
import { getCurrentSub2ApiUser } from '@/lib/sub2api/client';
import type { Sub2ApiUser } from '@/lib/sub2api/types';

type SessionInput = Request | { headers: Headers };

function requestHeaders(input: SessionInput): Headers {
  return input instanceof Request ? input.headers : input.headers;
}

async function mirrorUser(remoteUser: Sub2ApiUser) {
  const mirrored = {
    id: String(remoteUser.id),
    name: remoteUser.username || remoteUser.email,
    email: remoteUser.email,
    emailVerified: true,
    image: remoteUser.avatar_url || null,
    updatedAt: new Date(),
  };

  await maindb
    .insert(user)
    .values(mirrored)
    .onConflictDoUpdate({
      target: user.id,
      set: {
        name: mirrored.name,
        email: mirrored.email,
        emailVerified: true,
        image: mirrored.image,
        updatedAt: mirrored.updatedAt,
      },
    });

  return maindb.query.user.findFirst({ where: eq(user.id, mirrored.id) });
}

async function getSession(input: SessionInput) {
  const accessToken = readCookie(requestHeaders(input).get('cookie'), ACCESS_COOKIE);
  if (!accessToken) return null;

  try {
    const remoteUser = await getCurrentSub2ApiUser(accessToken);
    let mirroredUser: Awaited<ReturnType<typeof mirrorUser>> | null = null;
    try {
      mirroredUser = await mirrorUser(remoteUser);
    } catch (error) {
      console.error('[auth] local user mirror failed', error);
    }
    const sessionUser = mirroredUser || {
      id: String(remoteUser.id),
      name: remoteUser.username || remoteUser.email,
      email: remoteUser.email,
      emailVerified: true,
      image: remoteUser.avatar_url || null,
      createdAt: new Date(remoteUser.created_at),
      updatedAt: new Date(remoteUser.updated_at),
    };

    return {
      session: {
        id: `sub2api:${remoteUser.id}`,
        userId: sessionUser.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      user: sessionUser,
      wallet: {
        balance: remoteUser.balance,
        frozenBalance: remoteUser.frozen_balance || 0,
      },
    };
  } catch {
    return null;
  }
}

export const auth = {
  api: {
    getSession,
  },
};

// Temporary compatibility for legacy subscription server actions while their UI is removed.
export const dodoPayments = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || 'subscriptions-disabled',
  environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
});
