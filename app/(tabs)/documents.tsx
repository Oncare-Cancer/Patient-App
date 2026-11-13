import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, ScreenHeader } from '@/components/ui';
import { RecordsList } from '@/components/records/RecordsList';
import { GuestGate } from '@/components/guest/GuestGate';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { SURFACE } from '@/constants/theme';

/**
 * The Records route.
 *
 * Reports now live in the My Care tab (app/(tabs)/appointments.tsx). This
 * route stays because document notifications and older links open it; it
 * renders the same RecordsList, so the two cannot show different things.
 */
export default function Records() {
  const t = useT();
  const { isAuthenticated } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.records.title')} back={false} />
      {isAuthenticated ? (
        <Screen
          withNav
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setReloadKey((k) => k + 1);
          }}
        >
          <RecordsList reloadKey={reloadKey} onSettled={() => setRefreshing(false)} />
        </Screen>
      ) : (
        <Screen withNav>
          <GuestGate />
        </Screen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE.screen },
});
