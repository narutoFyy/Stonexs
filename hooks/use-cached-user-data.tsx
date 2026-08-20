'use client';

import { useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSession } from '@/lib/auth-client';
import { type ComprehensiveUserData } from '@/lib/user-data';

export function useCachedUserData() {
  const { data: session, isPending: isSessionPending, refetch: refetchSession } = useSession();

  // Cache user data in localStorage
  const [cachedUser, setCachedUser] = useLocalStorage<ComprehensiveUserData | null>('scira-user-data', null);

  // Keep the figure workflow on the same-origin Sub2API session endpoint.
  // The legacy user-data Server Action imports optional AI providers and can
  // fail when the production runtime is Linux/Alpine.
  const freshUser: ComprehensiveUserData | null | undefined = isSessionPending
    ? undefined
    : session
      ? {
          id: session.user.id,
          email: session.user.email,
          emailVerified: session.user.emailVerified,
          name: session.user.name || session.user.email.split('@')[0],
          image: session.user.image,
          createdAt: new Date(0),
          updatedAt: new Date(),
          isProUser: false,
          isMaxUser: false,
          planTier: 'free',
          proSource: 'none',
          subscriptionStatus: 'none',
          subscriptionHistory: [],
        }
      : null;

  // Only write to cache when we have a session; prevents re-caching after sign out (React Query may still hold stale data)
  useEffect(() => {
    if (session && freshUser) {
      setCachedUser(freshUser);
    }
  }, [session, freshUser, setCachedUser]);

  // Clear cache only after both session and user fetch confirm sign-out
  useEffect(() => {
    if (!isSessionPending && !session && freshUser === null && cachedUser) {
      setCachedUser(null);
    }
  }, [isSessionPending, session, freshUser, cachedUser, setCachedUser]);

  // Prefer fresh server data when available; only fall back to cached localStorage
  // data during initial load (before React Query has returned any data).
  // When signed out (session known to be null), never expose cached data.
  const user =
    !isSessionPending && !session
      ? null
      : freshUser !== undefined
        ? freshUser
        : cachedUser;

  // Show loading only if we have no cached data and fresh data is loading
  const isLoading = isSessionPending;

  // Recalculate derived properties based on current user data
  const isProUser = Boolean(user?.isProUser);
  const proSource = user?.proSource || 'none';
  const subscriptionStatus = user?.subscriptionStatus || 'none';

  // Helper function to check if user should have unlimited access for specific models
  const shouldBypassLimitsForModel = (_selectedModel: string) => false;

  return {
    // Core user data
    user,
    isLoading,
    error: null,
    refetch: refetchSession,
    isRefetching: false,

    // Quick access to commonly used properties
    isProUser,
    proSource,
    subscriptionStatus,

    // Polar subscription details
    polarSubscription: user?.polarSubscription,
    hasPolarSubscription: Boolean(user?.polarSubscription),

    // Dodo Subscription details
    dodoSubscription: user?.dodoSubscription,
    hasDodoSubscription: Boolean(user?.dodoSubscription?.hasSubscriptions),
    dodoExpiresAt: user?.dodoSubscription?.expiresAt,
    isDodoExpiring: Boolean(user?.dodoSubscription?.isExpiringSoon),
    isDodoExpired: Boolean(user?.dodoSubscription?.isExpired),

    // Subscription history
    subscriptionHistory: user?.subscriptionHistory || [],

    // Rate limiting helpers
    shouldCheckLimits: Boolean(!isLoading && user && !user.isProUser),
    shouldBypassLimitsForModel,

    // Subscription status checks
    hasActiveSubscription: user?.subscriptionStatus === 'active',
    isSubscriptionCanceled: user?.subscriptionStatus === 'canceled',
    isSubscriptionExpired: user?.subscriptionStatus === 'expired',
    hasNoSubscription: user?.subscriptionStatus === 'none',

    // Legacy compatibility helpers
    subscriptionData: user?.polarSubscription
      ? {
        hasSubscription: true,
        subscription: user.polarSubscription,
      }
      : { hasSubscription: false },

    // Map dodoSubscription to legacy dodoProStatus structure for settings dialog
    dodoProStatus: user?.dodoSubscription
      ? {
        isProUser: proSource === 'dodo' && isProUser,
        hasSubscriptions: user.dodoSubscription.hasSubscriptions,
        expiresAt: user.dodoSubscription.expiresAt,
        mostRecentSubscription: user.dodoSubscription.mostRecentSubscription,
        daysUntilExpiration: user.dodoSubscription.daysUntilExpiration,
        isExpired: user.dodoSubscription.isExpired,
        isExpiringSoon: user.dodoSubscription.isExpiringSoon,
        source: proSource,
      }
      : null,

    expiresAt: user?.dodoSubscription?.expiresAt,

    // Additional utilities
    isCached: Boolean(cachedUser),
    clearCache: () => setCachedUser(null),
  };
}

// Lightweight hook for components that only need to know if user is pro
export function useCachedIsProUser() {
  const { isProUser, isLoading } = useCachedUserData();
  return { isProUser, isLoading };
}

// Hook for components that need subscription status but not all user data
export function useCachedSubscriptionStatus() {
  const {
    subscriptionStatus,
    proSource,
    hasActiveSubscription,
    isSubscriptionCanceled,
    isSubscriptionExpired,
    hasNoSubscription,
    isLoading,
  } = useCachedUserData();

  return {
    subscriptionStatus,
    proSource,
    hasActiveSubscription,
    isSubscriptionCanceled,
    isSubscriptionExpired,
    hasNoSubscription,
    isLoading,
  };
}
