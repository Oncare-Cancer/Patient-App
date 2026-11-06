import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import { PALETTE, SURFACE } from '@/constants/theme';

/**
 * Notifications, reached from the bell on A4.
 *
 * Deliberately an empty shell for now. The redesign gives notifications no
 * screen of its own, and the app's `notificationApi` is currently mocked — it
 * returns three hardcoded fake notifications about documents and appointments
 * that were never sent. Rendering those would be worse than rendering nothing:
 * a patient would read a fabricated "Your report has been uploaded".
 *
 * Section 17 says every request status change pushes an in-app update, so the
 * real list arrives with the notifications endpoint on the backend. Until then
 * this says there is nothing, which is true.
 */
export default function Notifications() {
  const t = useT();

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('ui.profile.notifications')} />
      <Screen>
        <EmptyState
          icon={<Bell size={22} color={PALETTE.purple} strokeWidth={2} />}
          title={t('ui.notifications.empty')}
          body={t('ui.notifications.emptyBody')}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.screen,
  },
});
