import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { profileKeys, useDriverProfile } from '@/api/profile';
import { subscriptionKeys, useSubscriptions } from '@/api/subscriptions';
import { useVehicles, vehicleKeys } from '@/api/vehicles';
import { HomeHero } from '@/components/home-hero';
import { PassStatusCard } from '@/components/pass-status-card';
import { StatusTile, type StatusTileTone } from '@/components/status-tile';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { summarise } from '@/lib/compliance';
import { useAuth } from '@/providers/auth-provider';

const NAVY = '#0D2236';

export default function ComplianceHomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQ = useDriverProfile();
  const vehiclesQ = useVehicles();
  const subsQ = useSubscriptions();

  const summary = summarise({
    profile: profileQ.data,
    vehicles: vehiclesQ.data,
    subscriptions: subsQ.data,
  });

  const fullName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  const greetingName =
    fullName?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    user?.phone ??
    'driver';

  const [refreshing, setRefreshing] = useState(false);
  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.current }),
        queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  // Per-tile tone & destinations driven by the compliance summary.
  const profileTone: StatusTileTone =
    summary.profile.status === 'approved'
      ? 'success'
      : summary.profile.complete
        ? 'warning'
        : summary.profile.exists
          ? 'warning'
          : 'danger';
  const profileValue = !summary.profile.exists
    ? 'Not started'
    : !summary.profile.complete
      ? 'Incomplete'
      : summary.profile.status === 'approved'
        ? 'Verified'
        : summary.profile.status === 'rejected'
          ? 'Action needed'
          : 'Under review';
  const profileHint =
    summary.profile.status === 'approved'
      ? 'ID & licence on file'
      : summary.profile.complete
        ? 'Awaiting review'
        : 'Tap to complete';

  const platformTone: StatusTileTone =
    summary.platforms.verifiedCount === summary.platforms.totalCount
      ? 'success'
      : summary.platforms.verifiedCount > 0
        ? 'warning'
        : 'danger';
  const platformValue =
    summary.platforms.verifiedCount === summary.platforms.totalCount
      ? 'All connected'
      : `${summary.platforms.verifiedCount}/${summary.platforms.totalCount} verified`;
  const platformHint =
    summary.platforms.verifiedCount === summary.platforms.totalCount
      ? 'Uber · Bolt · inDrive'
      : 'Verify more';

  const vehicleTone: StatusTileTone =
    summary.vehicles.total === 0
      ? 'danger'
      : summary.vehicles.active === summary.vehicles.total
        ? 'success'
        : 'warning';
  const vehicleValue =
    summary.vehicles.total === 0
      ? 'None'
      : `${summary.vehicles.active}/${summary.vehicles.total} compliant`;
  const vehicleHint =
    summary.vehicles.total === 0
      ? 'Add a vehicle'
      : summary.vehicles.pending > 0
        ? `${summary.vehicles.pending} pending review`
        : 'All approved';

  const subTone: StatusTileTone =
    summary.subscriptions.activeCount === 0
      ? 'danger'
      : summary.subscriptions.daysUntilExpiry !== null &&
          summary.subscriptions.daysUntilExpiry <= 7
        ? 'warning'
        : 'success';
  const subValue =
    summary.subscriptions.activeCount === 0
      ? 'None'
      : summary.subscriptions.primary?.planType === 'yearly'
        ? 'Yearly pass'
        : 'Monthly pass';
  const subHint =
    summary.subscriptions.daysUntilExpiry !== null
      ? `Expires in ${summary.subscriptions.daysUntilExpiry} day${summary.subscriptions.daysUntilExpiry === 1 ? '' : 's'}`
      : 'Subscribe to a zone';

  const heroBadgeTone =
    summary.level === 'compliant'
      ? 'success'
      : summary.level === 'partial'
        ? 'warning'
        : 'danger';

  const passReady = summary.subscriptions.activeCount > 0;

  return (
    <View style={[styles.root, { backgroundColor: NAVY }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}>
          <HomeHero
            greetingName={greetingName}
            badge={`${summary.score}% compliant`}
            badgeTone={heroBadgeTone}
          />

          <View style={styles.body}>
            <View style={styles.passWrap}>
              <PassStatusCard summary={summary} />
            </View>

            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={styles.sectionLabel}>
              COMPLIANCE CENTRE
            </ThemedText>

            <View style={styles.gridRow}>
              <StatusTile
                icon="person-circle-outline"
                label="My Profile"
                value={profileValue}
                hint={profileHint}
                tone={profileTone}
                onPress={() =>
                  router.push(summary.profile.complete ? '/profile' : '/profile-edit')
                }
              />
              <StatusTile
                icon="cube-outline"
                label="Platforms"
                value={platformValue}
                hint={platformHint}
                tone={platformTone}
                onPress={() => router.push('/platforms')}
              />
            </View>
            <View style={styles.gridRow}>
              <StatusTile
                icon="car-sport-outline"
                label="Vehicles"
                value={vehicleValue}
                hint={vehicleHint}
                tone={vehicleTone}
                onPress={() =>
                  router.push(summary.vehicles.total === 0 ? '/vehicle/new' : '/garage')
                }
              />
              <StatusTile
                icon="card-outline"
                label="Subscriptions"
                value={subValue}
                hint={subHint}
                tone={subTone}
                onPress={() => router.push('/zones')}
              />
            </View>

            <View style={styles.ctas}>
              <Button
                title="Scan Digital Pass"
                onPress={() => router.push('/certificate')}
                disabled={!passReady}
                style={styles.ctaPrimary}
              />
              <Button
                title="Manage Vehicles"
                variant="outline"
                onPress={() => router.push('/garage')}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: Spacing.five },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: 0,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  passWrap: {
    // Lift the pass card up so it overlaps the navy hero, mirroring the mockup.
    marginTop: -(Spacing.five + Spacing.one),
  },
  sectionLabel: {
    letterSpacing: 1.5,
    marginTop: Spacing.two,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  ctas: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  ctaPrimary: {
    backgroundColor: NAVY,
  },
});
