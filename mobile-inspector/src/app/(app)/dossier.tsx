import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  useDossier,
  useReportIncident,
  useRevokeCompliance,
  useSuspendVehicle,
  type DossierVehicle,
} from '@/api/inspector';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const INCIDENT_TYPES = [
  { key: 'compliance_violation', label: 'Compliance violation' },
  { key: 'accident', label: 'Accident' },
  { key: 'passenger_dispute', label: 'Passenger dispute' },
] as const;

function toneFor(theme: ReturnType<typeof useTheme>, status: string): string {
  if (['active', 'approved', 'verified'].includes(status)) return theme.success;
  if (['suspended', 'rejected', 'expired', 'cancelled'].includes(status)) return theme.danger;
  return theme.warning;
}

export default function DossierScreen() {
  const theme = useTheme();
  const { driverId } = useLocalSearchParams<{ driverId: string }>();
  const { data: dossier, isLoading } = useDossier(driverId);

  const suspend = useSuspendVehicle(driverId);
  const revoke = useRevokeCompliance(driverId);
  const report = useReportIncident(driverId);

  const [incidentType, setIncidentType] = useState<string>('compliance_violation');
  const [notes, setNotes] = useState('');

  if (isLoading) return <LoadingScreen />;
  if (!dossier) {
    return (
      <Screen>
        <ThemedText type="default">Driver not found.</ThemedText>
      </Screen>
    );
  }

  const { driver, vehicles, activeSubscriptions } = dossier;

  function confirmSuspend(v: DossierVehicle) {
    Alert.alert('Suspend vehicle', `Suspend ${v.make} ${v.model} (${v.plate})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Suspend',
        style: 'destructive',
        onPress: async () => {
          try {
            await suspend.mutateAsync({ vehicleId: v.id, reason: 'Field inspection' });
            Alert.alert('Done', 'Vehicle suspended.');
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
          }
        },
      },
    ]);
  }

  function confirmRevoke() {
    Alert.alert(
      'Revoke driver compliance',
      'This cancels all active passes and suspends all vehicles for this driver.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke all',
          style: 'destructive',
          onPress: async () => {
            try {
              await revoke.mutateAsync();
              Alert.alert('Done', 'Driver compliance revoked.');
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
            }
          },
        },
      ]
    );
  }

  async function submitIncident() {
    try {
      await report.mutateAsync({
        vehicleId: vehicles[0]?.id ?? null,
        type: incidentType,
        notes,
      });
      setNotes('');
      Alert.alert('Reported', 'Incident logged against this driver.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
    }
  }

  return (
    <Screen scroll>
      {/* Driver */}
      <Card style={styles.cardGap}>
        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={40} color={theme.primary} />
          <View style={styles.flex}>
            <ThemedText type="smallBold">{driver.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ID {driver.idNumber ?? '—'} · Licence {driver.licenseNumber ?? '—'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.badges}>
          <StatusPill label={`Profile: ${driver.profileStatus}`} color={toneFor(theme, driver.profileStatus)} />
          <StatusPill label={`PrDP: ${driver.prdpStatus}`} color={toneFor(theme, driver.prdpStatus)} />
        </View>
      </Card>

      {/* Vehicles */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        VEHICLES ({vehicles.length})
      </ThemedText>
      {vehicles.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No vehicles on file.
        </ThemedText>
      ) : (
        vehicles.map((v) => (
          <Card key={v.id} style={styles.cardGap}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">
                  {v.make} {v.model} · {v.plate}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {v.category ?? 'Vehicle'} · {v.capacity ?? '?'} seats
                </ThemedText>
              </View>
              <StatusPill label={v.status} color={toneFor(theme, v.status)} />
            </View>
            {v.status !== 'suspended' ? (
              <Button
                title="Suspend vehicle"
                variant="outline"
                loading={suspend.isPending}
                onPress={() => confirmSuspend(v)}
              />
            ) : null}
          </Card>
        ))
      )}

      {/* Subscriptions */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        ACTIVE ZONE PASSES ({activeSubscriptions.length})
      </ThemedText>
      {activeSubscriptions.length === 0 ? (
        <ThemedText type="small" themeColor="danger">
          No active zone pass — not compliant to operate.
        </ThemedText>
      ) : (
        activeSubscriptions.map((s) => (
          <Card key={s.id} style={styles.cardGap}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{s.zone}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {s.plate} · valid until {s.endDate ?? '—'}
                </ThemedText>
              </View>
              <StatusPill label="active" color={theme.success} />
            </View>
          </Card>
        ))
      )}

      {/* Report incident */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        REPORT AN INCIDENT
      </ThemedText>
      <View style={styles.pills}>
        {INCIDENT_TYPES.map((t) => {
          const active = incidentType === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setIncidentType(t.key)}
              style={[
                styles.pill,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary + '15' : theme.backgroundElement,
                },
              ]}>
              <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
                {t.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <TextField
        placeholder="Notes (what did you observe?)"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <Button title="Submit incident report" loading={report.isPending} onPress={submitIncident} />

      {/* Revoke all */}
      <Button
        title="Revoke driver compliance"
        variant="danger"
        loading={revoke.isPending}
        onPress={confirmRevoke}
        style={styles.revoke}
      />
    </Screen>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.statusPill, { borderColor: color, backgroundColor: color + '22' }]}>
      <ThemedText type="small" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  cardGap: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  section: { letterSpacing: 1, marginTop: Spacing.two },
  pills: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  statusPill: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  revoke: { marginTop: Spacing.four },
});
