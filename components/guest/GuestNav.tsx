import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { BottomNav, type TabKey } from '@/components/ui';
import { LoginSheet } from '@/components/guest/LoginSheet';

/**
 * The bottom nav as a guest sees it.
 *
 * Section 06 puts Activity, Records and Profile behind login, so tapping them
 * opens the login sheet on the same screen rather than navigating — "A locked
 * action opens a login bottom sheet on the same screen, not a new page."
 *
 * Home and Book stay open: browsing doctors and slots is explicitly allowed, and
 * login is only asked for at the point of confirming.
 */
/** Where each locked tab lands once the patient is signed in. */
const TAB_PATH: Partial<Record<TabKey, string>> = {
  activity: '/(tabs)/appointments',
  records: '/(tabs)/documents',
  profile: '/(tabs)/profile',
};

export function GuestNav({ active }: { active: TabKey }) {
  const router = useRouter();
  const [locked, setLocked] = useState<TabKey | null>(null);

  const go = (key: TabKey) => {
    if (key === 'home') {
      router.replace('/guest');
      return;
    }
    // Browsing doctors is explicitly open to guests; login is only asked for at
    // the point of confirming a booking.
    if (key === 'book') {
      router.push('/guest/doctors');
      return;
    }
    setLocked(key);
  };

  return (
    <>
      <BottomNav
        active={active}
        onTab={go}
        onBook={() => router.push('/guest/doctors')}
      />
      <LoginSheet
        visible={locked !== null}
        // Nothing to restore for a tab, but the patient still lands where they
        // were heading instead of on Home.
        intent={
          locked && TAB_PATH[locked]
            ? { kind: 'route', summary: locked, path: TAB_PATH[locked]! }
            : undefined
        }
        onClose={() => setLocked(null)}
        onLogin={() => {
          setLocked(null);
          router.replace('/login');
        }}
      />
    </>
  );
}
