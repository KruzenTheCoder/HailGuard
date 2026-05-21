import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDriverProfile } from '@/api/profile';
import { useSubscriptions } from '@/api/subscriptions';
import { useVehicles } from '@/api/vehicles';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export default function ComplianceHomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useDriverProfile();
  const { data: vehicles } = useVehicles();
  const { data: subscriptions } = useSubscriptions();

  const greetingName = user?.email?.split('@')[0] ?? user?.phone ?? 'driver';

  const profileComplete = !!(
    profile?.idNumber &&
    profile?.licenseNumber &&
    profile?.idDocumentPath &&
    profile?.licenseDocumentPath
  );
  const vehicleCount = vehicles?.length ?? 0;
  const hasApprovedVehicle = (vehicles ?? []).some((v) => v.status === 'active');
  const hasActiveSubscription = (subscriptions ?? []).some((s) => s.status === 'active');

  const next = !profileComplete
    ? {
        icon: 'alert-circle-outline' as const,
        color: theme.warning,
        title: 'Complete your driver profile',
        body: 'Add your ID and licence details to begin the compliance process.',
        cta: 'Complete profile',
        onPress: () => router.push('/profile-edit'),
      }
    : vehicleCount === 0
      ? {
          icon: 'car-outline' as const,
          color: theme.warning,
          title: 'Register your first vehicle',
          body: 'Add a vehicle with its documents to get it approved.',
          cta: 'Add vehicle',
          onPress: () => router.push('/vehicle/new'),
        }
      : hasActiveSubscription
        ? {
            icon: 'shield-checkmark' as const,
            color: theme.success,
            title: "You're compliant",
            body: 'At least one vehicle has an active zone subscription.',
            cta: 'View certificate',
            onPress: () => router.push('/certificate'),
          }
        : hasApprovedVehicle
          ? {
              icon: 'map-outline' as const,
              color: theme.warning,
              title: 'Subscribe to a zone',
              body: 'You have an approved vehicle. Subscribe it to a zone to operate compliantly.',
              cta: 'Browse zones',
              onPress: () => router.push('/zones'),
            }
          : {
              icon: 'time-outline' as const,
              color: theme.warning,
              title: 'Awaiting review',
              body: 'Your profile and vehicles are submitted. Subscribe to a zone once approved.',
              cta: 'Browse zones',
              onPress: () => router.push('/zones'),
            };

  return (
    <Screen scroll>
      <View style={styles.heading}>
        <ThemedText type="small" themeColor="textSecondary">
          Welcome back
        </ThemedText>
        <ThemedText type="subtitle">{greetingName}</ThemedText>
      </View>

      <Card>
        <View style={styles.statusRow}>
          <Ionicons name={next.icon} size={22} color={next.color} />
          <ThemedText type="smallBold">{next.title}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {next.body}
        </ThemedText>
        <Button title={next.cta} style={styles.cardButton} onPress={next.onPress} />
      </Card>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
        QUICK ACTIONS
      </ThemedText>

      <Card>
        <ActionRow
          icon="car-outline"
          title="My Garage"
          subtitle={vehicleCount > 0 ? `${vehicleCount} vehicle(s) registered` : 'Register a vehicle'}
          onPress={() => router.push('/garage')}
        />
      </Card>
      <Card>
        <ActionRow
          icon="map-outline"
          title="Browse Zones"
          subtitle="Subscribe a vehicle to an operating zone"
          onPress={() => router.push('/zones')}
        />
      </Card>
    </Screen>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={24} color={theme.primary} />
      <View style={styles.actionText}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { gap: Spacing.half },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardButton: { marginTop: Spacing.two },
  sectionLabel: { marginTop: Spacing.two, letterSpacing: 0.5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  actionText: { flex: 1, gap: Spacing.half },
});
