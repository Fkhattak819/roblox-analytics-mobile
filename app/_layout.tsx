import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AppProvider } from '@/src/state/app-context';
import { AppearanceProvider, useAppearancePreference } from '@/src/state/appearance-context';
import { hasCompletedOnboarding } from '@/src/state/onboarding-storage';
import { colors, fonts } from '@/src/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return <AppearanceProvider><RootNavigation /></AppearanceProvider>;
}

function RootNavigation() {
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme() ?? 'dark';
  const { ready: appearanceReady } = useAppearancePreference();
  const initialRouteChecked = useRef(false);
  const [initialRouteReady, setInitialRouteReady] = useState(false);
  const [loaded, error] = useFonts({
    [fonts.regular]: require('../assets/fonts/BuilderSans-Regular-400.otf'),
    [fonts.medium]: require('../assets/fonts/BuilderSans-Medium-500.otf'),
    [fonts.semibold]: require('../assets/fonts/BuilderSans-SemiBold-600.otf'),
    [fonts.bold]: require('../assets/fonts/BuilderSans-Bold-700.otf'),
  });

  useEffect(() => {
    if ((!loaded && !error) || !appearanceReady) return;

    if (!initialRouteChecked.current) {
      initialRouteChecked.current = true;
      let cancelled = false;

      void hasCompletedOnboarding()
        .then((completed) => {
          if (!cancelled && !completed && segments.length === 1 && segments[0] === '(tabs)') {
            router.replace('/onboarding');
          }
        })
        .finally(() => {
          if (!cancelled) setInitialRouteReady(true);
        });

      return () => {
        cancelled = true;
      };
    }

    setInitialRouteReady(true);
  }, [appearanceReady, error, loaded, router, segments]);

  useEffect(() => {
    if (initialRouteReady) void SplashScreen.hideAsync();
  }, [initialRouteReady]);

  // Web static rendering must produce the same initial tree on the server and client.
  // Native can safely wait behind the splash screen until Builder Sans is loaded.
  if ((!loaded && !error || !appearanceReady) && Platform.OS !== 'web') return null;

  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.blue,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.red,
    },
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <AppProvider>
          <Stack
            initialRouteName="onboarding"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}>
            <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="live-sales-setup" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="experience-picker" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="notifications" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </AppProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
