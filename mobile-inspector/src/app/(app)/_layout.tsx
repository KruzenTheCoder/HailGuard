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
      <Stack.Screen name="index" options={{ title: 'Inspect' }} />
      <Stack.Screen name="dossier" options={{ title: 'Driver dossier' }} />
    </Stack>
  );
}
