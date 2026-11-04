import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashOverlay } from '@/components/SplashOverlay';
import { palette } from '@/constants/theme';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useAppHydration } from '@/hooks/useAppHydration';
import { FontProvider } from '@/providers/FontProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { useSettingsStore } from '@/store/settingsStore';
import { useTokenStore } from '@/store/tokenStore';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const router = useRouter();
  const { fontsLoaded, fontError } = useAppFonts();
  const hydrated = useAppHydration();
  const [showSplash, setShowSplash] = useState(true);
  const appReady = hydrated && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    if (appReady) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [appReady]);

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
    const settings = useSettingsStore.getState();
    const token = useTokenStore.getState().token;
    const isConfigured = Boolean(settings.githubUsername && settings.repoName && token);

    if (!isConfigured) {
      router.replace('/onboarding');
    }
  }, [router]);

  if (!appReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <FontProvider ready={fontsLoaded}>
        <ToastProvider>
          <StatusBar style={showSplash ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="onboarding"
              options={{ animation: 'slide_from_right', gestureEnabled: false }}
            />
            <Stack.Screen name="build/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
          </Stack>
          {showSplash ? <SplashOverlay onDone={handleSplashDone} /> : null}
        </ToastProvider>
      </FontProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: palette.primary,
  },
});
