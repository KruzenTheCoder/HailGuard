import { MAX_SHIFT_HOURS } from '@hailguard/shared';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useActiveShift, useClockIn, useClockOut, useRecentShifts } from '@/api/shifts';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';

// Mandatory rest after a shift that hit the legal maximum.
const REST_HOURS = 8;
const HOUR_MS = 3_600_000;

function hoursBetween(fromIso: string, toMs: number): number {
  return (toMs - Date.parse(fromIso)) / HOUR_MS;
}

export default function ShiftLogbookScreen() {
  const theme = useTheme();
  const activeQ = useActiveShift();
  const recentQ = useRecentShifts();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  // Tick every 30s so the running clock and limit checks stay current.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (activeQ.isLoading || recentQ.isLoading) return <LoadingScreen />;

  const active = activeQ.data;
  const elapsed = active ? hoursBetween(active.startTime, now) : 0;
  const overLimit = elapsed >= MAX_SHIFT_HOURS;

  // Rest enforcement: if the most recent completed shift hit the limit, the
  // driver must rest REST_HOURS before clocking in again.
  const lastShift = recentQ.data?.[0];
  const restRemaining =
    !active && lastShift?.endTime && (lastShift.totalHours ?? 0) >= MAX_SHIFT_HOURS
      ? REST_HOURS - hoursBetween(lastShift.endTime, now)
      : 0;
  const mustRest = restRemaining > 0;

  async function onClockIn() {
    try {
      await clockIn.mutateAsync();
    } catch (e) {
      Alert.alert('Could not clock in', e instanceof Error ? e.message : 'Try again.');
    }
  }
  async function onClockOut() {
    if (!active) return;
    try {
      await clockOut.mutateAsync(active.id);
    } catch (e) {
      Alert.alert('Could not clock out', e instanceof Error ? e.message : 'Try again.');
    }
  }

  return (
    <Screen scroll>
      <Card style={active ? { borderColor: overLimit ? theme.danger : theme.success } : undefined}>
        <View style={styles.statusRow}>
          <Ionicons
            name={active ? 'time' : 'time-outline'}
            size={22}
            color={active ? (overLimit ? theme.danger : theme.success) : theme.textSecondary}
          />
          <ThemedText type="smallBold">
            {active ? 'On shift' : 'Off shift'}
          </ThemedText>
        </View>

        {active ? (
          <>
            <ThemedText type="title" style={styles.hours}>
              {elapsed.toFixed(1)}h
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Started {formatDate(active.startTime)} · max {MAX_SHIFT_HOURS}h
            </ThemedText>
            {overLimit ? (
              <ThemedText type="small" themeColor="danger">
                Maximum driving hours reached. Clock out now and take a rest period — your zone pass
                is not valid past the legal limit.
              </ThemedText>
            ) : null}
            <Button
              title="Clock out"
              onPress={onClockOut}
              loading={clockOut.isPending}
              style={styles.action}
            />
          </>
        ) : mustRest ? (
          <>
            <ThemedText type="small" themeColor="danger">
              Mandatory rest in progress. You can clock in again in {Math.ceil(restRemaining)}h.
            </ThemedText>
            <Button title="Clock in" disabled style={styles.action} />
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Clock in when you start driving. We track your hours for fatigue compliance.
            </ThemedText>
            <Button
              title="Clock in"
              onPress={onClockIn}
              loading={clockIn.isPending}
              style={styles.action}
            />
          </>
        )}
      </Card>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
        RECENT SHIFTS
      </ThemedText>
      {(recentQ.data ?? []).length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No completed shifts yet.
        </ThemedText>
      ) : (
        (recentQ.data ?? []).map((s) => (
          <Card key={s.id}>
            <View style={styles.shiftRow}>
              <ThemedText type="small">{formatDate(s.startTime)}</ThemedText>
              <ThemedText type="smallBold">{(s.totalHours ?? 0).toFixed(1)}h</ThemedText>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  hours: { marginTop: Spacing.one },
  action: { marginTop: Spacing.two },
  sectionLabel: { letterSpacing: 1.5, marginTop: Spacing.two },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
