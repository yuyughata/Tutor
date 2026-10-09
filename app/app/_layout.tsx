import { Nunito_600SemiBold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initDownloads } from '../src/data/downloads';
import { useReducedMotion } from '../src/lib/a11y';
import { GateProvider } from '../src/state/gate';
import { KioskProvider } from '../src/state/kiosk';
import { PasscodeProvider } from '../src/state/passcode';
import { AuthProvider } from '../src/state/auth';
import { LibraryProvider } from '../src/state/library';
import { ProfilesProvider, useProfiles } from '../src/state/profiles';
import { ThemeProvider, useTheme } from '../src/state/theme';
import { colors } from '../src/theme';

/** First launch: nobody is reading yet, so ask who is before showing anything else. */
function OnboardingGuard() {
  const { ready, children } = useProfiles();
  const segments = useSegments();
  useEffect(() => {
    if (ready && children.length === 0 && segments[0] !== 'profile') router.replace('/profile/new?first=1');
  }, [ready, children.length, segments]);
  return null;
}

export default function RootLayout() {
  return <ThemeProvider><RootStack /></ThemeProvider>;
}

function RootStack() {
  useTheme(); // re-render the navigator (background colour) when the theme changes
  const [loaded] = useFonts({ Nunito_600SemiBold, Nunito_800ExtraBold, Nunito_900Black });
  const reduceMotion = useReducedMotion();
  useEffect(() => { initDownloads(); }, []);
  if (!loaded) return null;
  return (
    <AuthProvider>
      <ProfilesProvider>
        <LibraryProvider>
          <PasscodeProvider>
           <KioskProvider>
          <GateProvider>
            <StatusBar style="dark" />
            <OnboardingGuard />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: reduceMotion ? 'none' : 'default' }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="story/[slug]" options={{ animation: reduceMotion ? 'none' : 'slide_from_right' }} />
              <Stack.Screen name="read/[slug]" options={{ animation: reduceMotion ? 'none' : 'fade', gestureEnabled: false }} />
              <Stack.Screen name="profile/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="profile/switch" options={{ presentation: 'transparentModal', animation: reduceMotion ? 'none' : 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
              <Stack.Screen name="forgot-password" options={{ presentation: 'modal' }} />
              <Stack.Screen name="legal/privacy" options={{ presentation: 'modal' }} />
              <Stack.Screen name="passcode" options={{ presentation: 'modal' }} />
            </Stack>
          </GateProvider>
           </KioskProvider>
          </PasscodeProvider>
        </LibraryProvider>
      </ProfilesProvider>
    </AuthProvider>
  );
}
