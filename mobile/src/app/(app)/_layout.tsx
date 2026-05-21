import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AppStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text },
        headerTintColor: theme.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile-edit" options={{ title: 'Driver profile' }} />
      <Stack.Screen name="platforms" options={{ title: 'Platform verification' }} />
      <Stack.Screen name="vehicle/new" options={{ title: 'Add vehicle' }} />
      <Stack.Screen name="vehicle/[id]" options={{ title: 'Vehicle' }} />
      <Stack.Screen name="subscribe/[zoneId]" options={{ title: 'Subscribe' }} />
      <Stack.Screen name="certificate" options={{ title: 'Compliance certificate' }} />
      <Stack.Screen name="expiry" options={{ title: 'Document expiry' }} />
      <Stack.Screen name="shifts" options={{ title: 'Shift logbook' }} />
    </Stack>
  );
}
