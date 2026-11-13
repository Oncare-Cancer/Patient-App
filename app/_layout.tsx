import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, Image, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { SosProvider } from '../contexts/SosContext';
import Toast from 'react-native-toast-message';

import {
  initializeNotifications,
  initializeFCMAndSendToken,
  cleanupListeners,
  pushAlreadyGranted,
  saveGuestPushToken,
} from '../services/notifications';
import { existingGuestDeviceKey } from '../services/guestIdentity';

// === CONFIG: Change this URL to your dynamic splash image ===
const REMOTE_SPLASH_URL = 'https://www.oncarecancer.com/img/featured/2025-10-30%2C13%3A35%3A28.195Z-1024.png'; // Replace with your URL

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RemoteSplashScreen({ onLoaded }: { onLoaded: () => void }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Preload the image
    Image.prefetch(REMOTE_SPLASH_URL)
      .then(() => {
        setImageLoaded(true);
      })
      .catch(() => {
        setImageError(true);
        setImageLoaded(true); // Still proceed even if image fails
      });
  }, []);

  useEffect(() => {
    if (imageLoaded) {
      // Small delay to ensure smooth visual transition
      const timer = setTimeout(async () => {
        await SplashScreen.hideAsync();
        onLoaded();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [imageLoaded, onLoaded]);

  if (!imageLoaded) {
    return null; // Native splash is still visible
  }

  return (
    <View style={styles.container}>
      {!imageError ? (
        <Image
          source={{ uri: REMOTE_SPLASH_URL }}
          style={styles.image}
          resizeMode="contain"
          onError={() => {
            setImageError(true);
            SplashScreen.hideAsync();
            onLoaded();
          }}
        />
      ) : (
        <View style={styles.fallback} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#262f82',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '90%',
    height: '90%',
  },
  fallback: {
    flex: 1,
    backgroundColor: '#262f82',
  },
});

function RootLayoutNav() {
  const { isAuthenticated, loading, patient } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  const [showRemoteSplash, setShowRemoteSplash] = useState(true);
  const notificationsInitialized = useRef(false);

  // Initialize FCM once when component mounts
  useEffect(() => {
    initializeFCMAndSendToken();
  }, []);

  // Handle app initialization and authentication
  useEffect(() => {
    async function prepare() {
      try {
        // Wait for authentication to load
        if (loading) return;

        /*
         * Routing by auth state.
         *
         * Two rules, and they need TWO DIFFERENT route sets — collapsing them
         * into one is what caused two separate rounds of "everything bounces
         * back to Home" bugs:
         *
         *   no session  + route not open to guests -> go to login
         *   has session + route is signed-out only -> go into the app
         *
         * `SIGNED_OUT_ONLY` is the small set that a logged-in patient has no
         * business on. It must NOT include /services, /centre, /doctor or
         * /search: an earlier version redirected a signed-in patient whenever
         * `segments[0] !== '(tabs)'`, which matched every stacked route the app
         * pushes, so Second Opinion, Order Medicines, Lab Test at Home,
         * Admission, FAQs and the centre/doctor pages were all unreachable.
         *
         * `GUEST_BROWSABLE` is the larger set a visitor without a session may
         * see. It carries the service flows because a guest can now raise a
         * medicine, lab, admission or second-opinion request by giving a name
         * and number at the point of submit, and the catalogue and profile
         * screens because they read the token-free endpoints.
         */
        /*
         * Round 7: the app opens on Home, signed in or not.
         *
         * A guest can now go everywhere a visitor has a reason to be - Home,
         * Discover, Book, every service form - and the two tabs that hold
         * patient data (My Care, Profile) render their own "log in to see
         * this" state instead of bouncing the visitor to a login wall. So
         * the gate shrinks to the routes that are ONLY patient data, with no
         * guest state to show.
         *
         * Login is a modal over the app and closes itself on success (see
         * app/login.tsx), so a signed-in patient is no longer redirected away
         * from it here - that redirect raced the screen's own navigation.
         */
        const first = segments[0] as string | undefined;
        const second = segments[1] as string | undefined;
        const patientOnly =
          first === 'notifications' ||
          (first === 'profile' && second === 'personal');

        if ((!isAuthenticated || !patient) && patientOnly) {
          router.replace('/login');
        }
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, [isAuthenticated, loading, patient, segments]);

  /** Where a tapped notification opens. Shared by patients and guests. */
  const onNotificationOpened = (response: any) => {
    console.log('Notification clicked:', response);
    const title = response.notification.request.content.title?.toLowerCase() || '';
    const body = response.notification.request.content.body?.toLowerCase() || '';
    const combinedText = title + ' ' + body;
    const data = response.notification.request.content.data || {};
    // A request moving along ("Called", "Scheduled", ...) carries its id.
    if (data.requestId) {
      router.push({ pathname: '/(tabs)/appointments', params: { view: 'requests' } } as never);
      return;
    }
    if (
      combinedText.includes('document') ||
      combinedText.includes('report') ||
      combinedText.includes('prescription') ||
      data.type === 'document_upload'
    ) {
      router.push('/(tabs)/documents');
    }
  };

  // Initialize notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && patient && !notificationsInitialized.current) {
      console.log('Initializing notifications for patient:', patient._id);
      
      initializeNotifications({
        patientId: patient._id,
        onNotificationReceived: (notification) => {
          console.log('Notification received (foreground):', notification);
        },
        onNotificationOpened,
      });

      notificationsInitialized.current = true;
    }

    return () => {
      if (!isAuthenticated || !patient) {
        console.log('Cleaning up notification listeners');
        cleanupListeners();
        notificationsInitialized.current = false;
      }
    };
  }, [isAuthenticated, patient, router]);

  /**
   * A guest who has sent a request from this phone and allowed notifications
   * gets the same listeners (foreground display, tap to My Care), and the
   * token is re-filed in case it rotated. Never asks for permission here:
   * that happens once, right after their first request.
   */
  useEffect(() => {
    if (loading || isAuthenticated) return;
    let alive = true;
    void (async () => {
      const [key, granted] = await Promise.all([existingGuestDeviceKey(), pushAlreadyGranted()]);
      if (!alive || !key || !granted) return;
      const token = await initializeNotifications({
        onNotificationReceived: (notification) => {
          console.log('Notification received (foreground):', notification);
        },
        onNotificationOpened,
      });
      if (token) await saveGuestPushToken(token);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated]);

  // Show remote splash until it's loaded
  if (showRemoteSplash) {
    return <RemoteSplashScreen onLoaded={() => setShowRemoteSplash(false)} />;
  }

  // Show nothing until app is ready (native splash still visible)
  if (!appIsReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      {/* Full-screen modal over whatever the patient was doing, so closing
          it - or logging in - returns them there rather than to Home. */}
      <Stack.Screen
        name="login"
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="guest" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  // The expo-font config plugin embeds these natively, so in a built app this
  // resolves on the first tick and there is no font flash. useFonts is still
  // needed for web and Expo Go, where there is nothing to embed into.
  const [fontsLoaded, fontError] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
    'NotoSansDevanagari-Regular': require('../assets/fonts/NotoSansDevanagari-Regular.ttf'),
    'NotoSansDevanagari-Medium': require('../assets/fonts/NotoSansDevanagari-Medium.ttf'),
    'NotoSansDevanagari-SemiBold': require('../assets/fonts/NotoSansDevanagari-SemiBold.ttf'),
  });

  // A font that fails to load must not block the app — the patient still needs
  // to reach their reports. Text falls back to the system face instead.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <SosProvider>
          <AuthProvider>
            <RootLayoutNav />
            <StatusBar style="light" />
            <Toast />
          </AuthProvider>
        </SosProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}