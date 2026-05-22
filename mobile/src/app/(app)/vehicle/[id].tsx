import { capacityQualification } from '@hailguard/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useDeleteVehicle, useUpdateVehicle, useVehicle } from '@/api/vehicles';
import { DocumentField } from '@/components/document-field';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BUCKETS, uploadDocument, type PickedDocument } from '@/lib/storage';
import { useAuth } from '@/providers/auth-provider';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function VehicleDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: vehicle, isLoading } = useVehicle(id);
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [expiry, setExpiry] = useState('');
  const [pickedReg, setPickedReg] = useState<PickedDocument | null>(null);
  const [pickedRoadworthy, setPickedRoadworthy] = useState<PickedDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) setExpiry(vehicle.roadworthyExpiresAt ?? '');
  }, [vehicle]);

  if (isLoading) return <LoadingScreen />;
  if (!vehicle) {
    return (
      <Screen>
        <ThemedText type="default">Vehicle not found.</ThemedText>
      </Screen>
    );
  }

  async function save() {
    if (!vehicle || !user) return;
    setError(null);
    if (expiry && !DATE_RE.test(expiry.trim())) {
      setError('Roadworthy expiry must be in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        roadworthy_expires_at: expiry.trim() || null,
      };
      if (pickedReg) {
        patch.registration_document_path = await uploadDocument(
          BUCKETS.vehicle,
          `${user.id}/${vehicle.id}/registration.${pickedReg.ext}`,
          pickedReg
        );
      }
      if (pickedRoadworthy) {
        patch.roadworthy_certificate_path = await uploadDocument(
          BUCKETS.vehicle,
          `${user.id}/${vehicle.id}/roadworthy.${pickedRoadworthy.ext}`,
          pickedRoadworthy
        );
      }
      await updateVehicle.mutateAsync({ id: vehicle.id, patch });
      setPickedReg(null);
      setPickedRoadworthy(null);
      Alert.alert('Saved', 'Vehicle updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the vehicle.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!vehicle) return;
    Alert.alert('Delete vehicle', `Remove ${vehicle.make} ${vehicle.model}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVehicle.mutateAsync(vehicle.id);
            router.back();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete.');
          }
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <Card>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <ThemedText type="subtitle">
              {vehicle.make} {vehicle.model}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {vehicle.year} · {vehicle.licensePlate}
            </ThemedText>
          </View>
          <StatusBadge status={vehicle.status} />
        </View>
        {vehicle.status === 'rejected' && vehicle.reviewNote ? (
          <ThemedText type="small" themeColor="danger">
            {vehicle.reviewNote}
          </ThemedText>
        ) : null}
      </Card>

      <Card>
        <ThemedText type="smallBold">Compliance restrictions</ThemedText>
        <View style={styles.specRow}>
          <View style={styles.flex}>
            <ThemedText type="small" themeColor="textSecondary">
              Max passengers
            </ThemedText>
            <ThemedText type="smallBold">
              {vehicle.passengerCapacity != null ? vehicle.passengerCapacity : '—'}
            </ThemedText>
          </View>
          <View style={styles.flex}>
            <ThemedText type="small" themeColor="textSecondary">
              Category
            </ThemedText>
            <ThemedText type="smallBold">{vehicle.vehicleCategory ?? '—'}</ThemedText>
          </View>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {capacityQualification(vehicle.passengerCapacity)}
        </ThemedText>
      </Card>

      <TextField
        label="Roadworthy expiry"
        placeholder="YYYY-MM-DD"
        value={expiry}
        onChangeText={setExpiry}
      />

      <DocumentField
        label="Vehicle registration"
        existingPath={vehicle.registrationDocumentPath}
        picked={pickedReg}
        onChange={setPickedReg}
      />
      <DocumentField
        label="Roadworthy certificate"
        existingPath={vehicle.roadworthyCertificatePath}
        picked={pickedRoadworthy}
        onChange={setPickedRoadworthy}
      />

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button title="Save changes" loading={saving} onPress={save} />
      <Button
        title="Delete vehicle"
        variant="danger"
        onPress={confirmDelete}
        loading={deleteVehicle.isPending}
        style={{ backgroundColor: theme.danger }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  flex: { flex: 1 },
  specRow: { flexDirection: 'row', gap: Spacing.three },
});
