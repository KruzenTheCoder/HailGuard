import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AppTabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Compliance',
          tabBarLabel: 'Home',
          // The home screen owns its own navy hero so the default header is hidden.
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: 'My Garage',
          tabBarLabel: 'Garage',
          tabBarIcon: ({ color, size }) => <Ionicons name="car-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="zones"
        options={{
          title: 'Zones',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
