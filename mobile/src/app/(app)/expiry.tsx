import { expiryStatus, type ExpiryStatus } from '@hailguard/shared';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDriverProfile } from '@/api/profile';
import { useSubscriptions } from '@/api/subscriptions';
import { useVehicles } from '@/api/vehicles';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';
import { syncExpiryReminders, type ExpiryReminder } from '@/lib/notifications';

type Row = { key: string; label: string; date: string | null };

export default function ExpiryTrackerScreen() {
  const profileQ = useDriverProfile();
  const vehiclesQ = useVehicles();
  const subsQ = useSubscriptions();

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [
      { key: 'prdp', label: 'Professional Driving Permit (PrDP)', date: profileQ.data?.prdpExpiresAt ?? null },
    ];
    for (const v of vehiclesQ.data ?? []) {
      out.push({
        key: `roadworthy:${v.id}`,
        label: `Roadworthy — ${v.make} ${v.model} (${v.licensePlate})`,
        date: v.roadworthyExpiresAt,
      });
    }
    for (const s of (subsQ.data ?? []).filter((x) => x.status === 'active')) {
      out.push({ key: `sub:${s.id}`, label: `Zone pass — ${s.zoneName}`, date: s.endDate });
    }
    return out;
  }, [profileQ.data, vehiclesQ.data, subsQ.data]);

  // Schedule local reminders for every dated document.
  useEffect(() => {
    const dated: ExpiryReminder[] = rows
      .filter((r): r is Row & { date: string } => !!r.date)
      .map((r) => ({ key: r.key, label: r.label, date: r.date }));
    if (dated.length > 0) void syncExpiryReminders(dated);
  }, [rows]);

  if (profileQ.isLoading || vehiclesQ.isLoading || subsQ.isLoading) return <LoadingScreen />;

  return (
    <Screen scroll>
      <ThemedText type="small" themeColor="textSecondary">
        Green is valid, amber expires within 30 days, red has expired. We&apos;ll remind you 30, 15
        and 0 days before each document lapses.
      </ThemedText>
      {rows.map((row) => (
        <ExpiryCard key={row.key} label={row.label} date={row.date} />
      ))}
    </Screen>
  );
}

function ExpiryCard({ label, date }: { label: string; date: string | null }) {
  const theme = useTheme();
  const { status, daysLeft } = expiryStatus(date);
  const tone: Record<ExpiryStatus, string> = {
    valid: theme.success,
    expiring: theme.warning,
    expired: theme.danger,
    missing: theme.textSecondary,
  };
  const color = tone[status];
  const caption =
    status === 'missing'
      ? 'Not on file'
      : status === 'expired'
        ? `Expired ${formatDate(date)}`
        : status === 'expiring'
          ? `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${formatDate(date)})`
          : `Valid until ${formatDate(date)}`;

  return (
    <Card>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.flex}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {caption}
          </ThemedText>
        </View>
        <Ionicons
          name={
            status === 'valid'
              ? 'checkmark-circle'
              : status === 'missing'
                ? 'ellipse-outline'
                : 'alert-circle'
          }
          size={22}
          color={color}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dot: { width: 12, height: 12, borderRadius: 6 },
  flex: { flex: 1, gap: Spacing.half },
});
