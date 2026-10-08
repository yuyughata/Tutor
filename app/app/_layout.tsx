import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ProfileProvider } from '../src/profile';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <ProfileProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </ProfileProvider>
  );
}
