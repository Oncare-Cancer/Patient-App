import React from 'react';
import { useRouter } from 'expo-router';
import { BottomNav, TAB_ROUTES, type TabKey } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

/**
 * The bottom nav on the few screens that live outside the tab group
 * (app/guest/*).
 *
 * It used to be a second, guest-only nav with its own idea of where each tab
 * went - /guest for Home, /guest/doctors for Book, a login sheet for the rest.
 * Round 7 opens every tab to a guest, so this is now the same bar with the
 * same routes (TAB_ROUTES); My Care and Profile show their own login prompt.
 */
export function GuestNav({ active }: { active: TabKey }) {
  const router = useRouter();
  const { isAuthenticated, patient } = useAuth();
  const go = (key: TabKey) => router.replace(TAB_ROUTES[key] as never);
  return (
    <BottomNav
      active={active}
      onTab={go}
      onBook={() => go('book')}
      guest={!(isAuthenticated && patient)}
      onLogin={() => router.push('/login')}
    />
  );
}
