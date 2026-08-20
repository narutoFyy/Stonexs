'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ResearchSession {
  session: { id: string; userId: string };
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
  };
  wallet: { balance: number; frozenBalance: number };
}

export function useSession() {
  const [data, setData] = useState<ResearchSession | null>(null);
  const [isPending, setIsPending] = useState(true);

  const refetch = useCallback(async () => {
    setIsPending(true);
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      setData(response.ok ? ((await response.json()) as ResearchSession | null) : null);
    } catch {
      setData(null);
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, isPending, refetch };
}

export async function signOut() {
  return fetch('/api/auth/logout', { method: 'POST' });
}

export const signIn = {
  social: async (..._args: unknown[]) => {
    window.location.assign('/sign-in');
  },
};

export const signUp = {
  email: async () => {
    window.location.assign('https://yf-mail.com/register');
  },
};

// Transitional compatibility while legacy subscription screens are removed from the fork.
export const authClient: any = {
  getLastUsedLoginMethod: () => null,
  customer: {
    portal: async () => ({ error: { message: 'Subscription payments are disabled' } }),
    orders: { list: async () => ({ data: null, error: null }) },
  },
};

export const betterauthClient: any = {
  dodopayments: {
    checkoutSession: async () => ({ data: null, error: { message: 'Subscription payments are disabled' } }),
    customer: {
      portal: async () => ({ data: null, error: { message: 'Subscription payments are disabled' } }),
      subscriptions: { list: async () => ({ data: null, error: null }) },
    },
  },
};
