import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { runMigrations } from '@/db/client';
import { useRemindersStore } from '@/store/reminders';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadReminders = useRemindersStore((s) => s.loadReminders);

  useEffect(() => {
    async function init() {
      await runMigrations();
      await loadReminders();
      SplashScreen.hideAsync();
    }
    init();
  }, [loadReminders]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(onboarding)" />
    </Stack>
  );
}
