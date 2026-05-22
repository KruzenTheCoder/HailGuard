import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  useReportIncident,
  useSuspendVehicle,
  useVehicleDetail,
  type VehicleDetail,
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
  if (['suspended', 'rejected', 'expired', 'cancelled'].includes(status))
    return theme.danger;
  return theme.warning;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

export default function VehicleDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: detail, isLoading } = useVehicleDetail(id);

  if (isLoading) return <LoadingScreen />;
  if (!detail) {
    return (
      <Screen>
        <ThemedText type="default">Vehicle not found.</ThemedText>
      </Screen>
    );
  }
  return <VehicleDetailBody detail={detail} />;
}

function VehicleDetailBody({ detail }: { detail: VehicleDetail }) {
  const theme = useTheme();
  const { vehicle, driver, subscriptions, incidents } = detail;

  const suspend = useSuspendVehicle(driver.id);
  const report = useReportIncident(driver.id);

  const [incidentType, setIncidentType] = useState<string>('compliance_violation');
  const [notes, setNotes] = useState('');

  const roadworthyDays = daysUntil(vehicle.roadworthyExpiresAt);
  const roadworthyTone =
    roadworthyDays === null
      ? theme.textSecondary
      : roadworthyDays < 0
        ? theme.danger
        : roadworthyDays <= 30
          ? theme.warning
          : theme.success;
  const roadworthyText =
    roadworthyDays === null
      ? '—'
      : roadworthyDays < 0
        ? `Expired ${-roadworthyDays}d ago`
        : `${roadworthyDays}d remaining`;

  const activeSub = subscriptions.find((s) => s.status === 'active') ?? null;

  function confirmSuspend() {
    Alert.alert(
      'Suspend vehicle',
      `Suspend ${vehicle.make} ${vehicle.model} (${vehicle.plate})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              await suspend.mutateAsync({
                vehicleId: vehicle.id,
                reason: 'Field inspection',
              });
              Alert.alert('Done', 'Vehicle suspended.');
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
            }
          },
        },
      ],
    );
  }

  async function submitIncident() {
    try {
      await report.mutateAsync({
        vehicleId: vehicle.id,
        type: incidentType,
        notes,
      });
      setNotes('');
      Alert.alert('Reported', 'Incident logged against this vehicle.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
    }
  }

  return (
    <Screen scroll>
      {/* Hero — make/model + plate + status */}
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: theme.backgroundSelected },
            ]}>
            <Ionicons name="car-sport" size={32} color={theme.primary} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.eyebrow}>
              {vehicle.year} · {vehicle.category ?? 'Vehicle'}
            </ThemedText>
            <ThemedText style={styles.heroTitle}>
              {vehicle.make} {vehicle.model}
            </ThemedText>
            <View style={styles.plateRow}>
              <View
                style={[
                  styles.plate,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText style={styles.plateText}>{vehicle.plate}</ThemedText>
              </View>
              <StatusPill
                label={vehicle.status}
                color={toneFor(theme, vehicle.status)}
              />
            </View>
          </View>
        </View>
        {vehicle.reviewNote ? (
          <View
            style={[
              styles.noteBox,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}>
            <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              {vehicle.reviewNote}
            </ThemedText>
          </View>
        ) : null}
      </Card>

      {/* Driver linked to this vehicle */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        REGISTERED OWNER
      </ThemedText>
      <Card style={styles.cardGap}>
        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={36} color={theme.primary} />
          <View style={styles.flex}>
            <ThemedText type="smallBold">{driver.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ID {driver.idNumber ?? '—'} · Licence {driver.licenseNumber ?? '—'}
            </ThemedText>
            {driver.phone ? (
              <ThemedText type="small" themeColor="textSecondary">
                {driver.phone}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <View style={styles.badges}>
          <StatusPill
            label={`Profile: ${driver.profileStatus}`}
            color={toneFor(theme, driver.profileStatus)}
          />
          <StatusPill
            label={`PrDP: ${driver.prdpStatus}`}
            color={toneFor(theme, driver.prdpStatus)}
          />
        </View>
      </Card>

      {/* Spec sheet — the headline of "full details" */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        VEHICLE SPECIFICATIONS
      </ThemedText>
      <Card style={styles.cardGap}>
        <SpecRow label="VIN" value={vehicle.vinNumber ?? '—'} mono />
        <SpecRow label="Engine no." value={vehicle.engineNumber ?? '—'} mono />
        <SpecRow label="Category" value={vehicle.category ?? '—'} />
        <SpecRow
          label="Passenger capacity"
          value={vehicle.capacity != null ? `${vehicle.capacity} seats` : '—'}
        />
        <SpecRow label="Model year" value={String(vehicle.year)} />
        <SpecRow label="Added to HailGuard" value={formatDate(vehicle.createdAt)} />
      </Card>

      {/* Compliance documents */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        COMPLIANCE DOCUMENTS
      </ThemedText>
      <Card style={styles.cardGap}>
        <View style={styles.row}>
          <Ionicons
            name="document-text-outline"
            size={22}
            color={roadworthyTone}
          />
          <View style={styles.flex}>
            <ThemedText type="smallBold">Roadworthy certificate</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Expires {formatDate(vehicle.roadworthyExpiresAt)} · {roadworthyText}
            </ThemedText>
          </View>
          <Ionicons
            name={
              vehicle.hasRoadworthyCertificate
                ? 'checkmark-circle'
                : 'close-circle-outline'
            }
            size={20}
            color={vehicle.hasRoadworthyCertificate ? theme.success : theme.danger}
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="receipt-outline" size={22} color={theme.textSecondary} />
          <View style={styles.flex}>
            <ThemedText type="smallBold">Registration document</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {vehicle.hasRegistrationDocument ? 'On file' : 'Missing'}
            </ThemedText>
          </View>
          <Ionicons
            name={
              vehicle.hasRegistrationDocument
                ? 'checkmark-circle'
                : 'close-circle-outline'
            }
            size={20}
            color={vehicle.hasRegistrationDocument ? theme.success : theme.danger}
          />
        </View>
      </Card>

      {/* Zone pass coverage */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        ZONE PASS HISTORY ({subscriptions.length})
      </ThemedText>
      {subscriptions.length === 0 ? (
        <ThemedText type="small" themeColor="danger">
          This vehicle has never held a zone pass.
        </ThemedText>
      ) : (
        subscriptions.map((s) => (
          <Card key={s.id} style={styles.cardGap}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{s.zone}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {s.planType} · {formatDate(s.startDate)} → {formatDate(s.endDate)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {s.currency} {Number(s.amount).toFixed(2)}
                </ThemedText>
              </View>
              <StatusPill label={s.status} color={toneFor(theme, s.status)} />
            </View>
          </Card>
        ))
      )}

      {/* Incident history */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        INCIDENT HISTORY ({incidents.length})
      </ThemedText>
      {incidents.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No incidents on record.
        </ThemedText>
      ) : (
        incidents.map((i) => (
          <Card key={i.id} style={styles.cardGap}>
            <View style={styles.row}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={i.status === 'resolved' ? theme.success : theme.warning}
              />
              <View style={styles.flex}>
                <ThemedText type="smallBold">{i.type.replace(/_/g, ' ')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDate(i.createdAt)} · {i.status.replace(/_/g, ' ')}
                </ThemedText>
                {i.notes ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {i.notes}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Field actions */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        FIELD ACTIONS
      </ThemedText>

      {activeSub ? (
        <ThemedText type="small" themeColor="textSecondary">
          This vehicle&apos;s {activeSub.zone} pass is{' '}
          <ThemedText type="smallBold" style={{ color: theme.success }}>
            active
          </ThemedText>{' '}
          until {formatDate(activeSub.endDate)}.
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="danger">
          No active zone pass — this vehicle is not compliant to operate.
        </ThemedText>
      )}

      {vehicle.status !== 'suspended' ? (
        <Button
          title="Suspend this vehicle"
          variant="danger"
          loading={suspend.isPending}
          onPress={confirmSuspend}
        />
      ) : null}

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
                  backgroundColor: active
                    ? theme.primary + '15'
                    : theme.backgroundElement,
                },
              ]}>
              <ThemedText
                type="small"
                themeColor={active ? 'text' : 'textSecondary'}>
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
      <Button
        title="Log incident on this vehicle"
        loading={report.isPending}
        onPress={submitIncident}
      />
    </Screen>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={[
        styles.statusPill,
        { borderColor: color, backgroundColor: color + '22' },
      ]}>
      <ThemedText type="small" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

function SpecRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.specRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.specLabel}>
        {label}
      </ThemedText>
      <ThemedText
        type="smallBold"
        style={[styles.specValue, mono ? styles.mono : null]}
        numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  cardGap: { gap: Spacing.two },
  badges: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  section: { letterSpacing: 1, marginTop: Spacing.two },

  heroCard: { gap: Spacing.three },
  heroRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { letterSpacing: 1, fontSize: 11 },
  heroTitle: { fontSize: 22, fontWeight: '700' },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
    flexWrap: 'wrap',
  },
  plate: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
  },
  plateText: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },

  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 4,
  },
  specLabel: { flexShrink: 0 },
  specValue: { flex: 1, textAlign: 'right' },
  mono: { fontFamily: 'monospace', letterSpacing: 1 },

  pills: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
