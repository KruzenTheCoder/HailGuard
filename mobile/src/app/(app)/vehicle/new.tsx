import { capacityQualification, VEHICLE_CATEGORIES, type VehicleCategory } from '@hailguard/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useCreateVehicle, useUpdateVehicle } from '@/api/vehicles';
import { DocumentField } from '@/components/document-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BUCKETS, uploadDocument, type PickedDocument } from '@/lib/storage';
import { decodeVin } from '@/lib/vehicle-spec';
import { useAuth } from '@/providers/auth-provider';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function NewVehicleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [engine, setEngine] = useState('');
  const [capacity, setCapacity] = useState('');
  const [category, setCategory] = useState<VehicleCategory | null>(null);
  const [roadworthyExpiry, setRoadworthyExpiry] = useState('');
  const [pickedReg, setPickedReg] = useState<PickedDocument | null>(null);
  const [pickedRoadworthy, setPickedRoadworthy] = useState<PickedDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capacityNum = capacity.trim() ? Number(capacity) : null;

  async function autofillFromVin() {
    if (vin.trim().length < 11) {
      Alert.alert('Enter a VIN', 'Enter the full 17-character VIN for an accurate lookup.');
      return;
    }
    setDecoding(true);
    try {
      const spec = await decodeVin(vin);
      if (!spec || (!spec.make && !spec.model)) {
        Alert.alert('No match', 'Could not decode that VIN — please enter the details manually.');
        return;
      }
      if (spec.make) setMake(spec.make);
      if (spec.model) setModel(spec.model);
      if (spec.year) setYear(String(spec.year));
      if (spec.passengerCapacity) setCapacity(String(spec.passengerCapacity));
      if (spec.vehicleCategory) setCategory(spec.vehicleCategory);
      Alert.alert('Specs loaded', 'Vehicle details were filled from the VIN. Please review before saving.');
    } finally {
      setDecoding(false);
    }
  }

  function validate(): string | null {
    if (!make.trim() || !model.trim() || !plate.trim()) {
      return 'Make, model and licence plate are required.';
    }
    const y = Number(year);
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(y) || y < 1950 || y > maxYear) {
      return `Enter a valid year between 1950 and ${maxYear}.`;
    }
    if (capacity.trim() && (!Number.isInteger(capacityNum) || (capacityNum ?? 0) < 1 || (capacityNum ?? 0) > 60)) {
      return 'Passenger capacity must be a whole number between 1 and 60.';
    }
    if (roadworthyExpiry && !DATE_RE.test(roadworthyExpiry.trim())) {
      return 'Roadworthy expiry must be in YYYY-MM-DD format.';
    }
    return null;
  }

  async function save() {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!user) {
      setError('You are not signed in.');
      return;
    }

    setSaving(true);
    try {
      const vehicle = await createVehicle.mutateAsync({
        make: make.trim(),
        model: model.trim(),
        year: Number(year),
        licensePlate: plate.trim().toUpperCase(),
        vinNumber: vin.trim() || null,
        engineNumber: engine.trim() || null,
        passengerCapacity: capacityNum,
        vehicleCategory: category,
        roadworthyExpiresAt: roadworthyExpiry.trim() || null,
      });

      const patch: Record<string, unknown> = {};
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
      if (Object.keys(patch).length > 0) {
        await updateVehicle.mutateAsync({ id: vehicle.id, patch });
      }

      Alert.alert('Vehicle added', 'Your vehicle has been submitted for review.');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the vehicle.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <TextField label="Make" placeholder="e.g. Toyota" value={make} onChangeText={setMake} />
      <TextField label="Model" placeholder="e.g. Corolla" value={model} onChangeText={setModel} />
      <TextField
        label="Year"
        placeholder="e.g. 2020"
        keyboardType="number-pad"
        maxLength={4}
        value={year}
        onChangeText={setYear}
      />
      <TextField
        label="Licence plate"
        placeholder="e.g. CA 123 456"
        autoCapitalize="characters"
        value={plate}
        onChangeText={setPlate}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        TECHNICAL SPECIFICATIONS
      </ThemedText>
      <TextField
        label="VIN number"
        placeholder="Vehicle identification number"
        autoCapitalize="characters"
        value={vin}
        onChangeText={setVin}
        hint="Enter the VIN, then auto-fill specs from the vehicle database."
      />
      <Button
        title="Auto-fill specs from VIN"
        variant="secondary"
        loading={decoding}
        onPress={autofillFromVin}
      />
      <TextField
        label="Engine number"
        placeholder="Engine number"
        autoCapitalize="characters"
        value={engine}
        onChangeText={setEngine}
      />
      <TextField
        label="Passenger capacity"
        placeholder="e.g. 4"
        keyboardType="number-pad"
        maxLength={2}
        value={capacity}
        onChangeText={setCapacity}
      />

      <ThemedText type="smallBold" themeColor="textSecondary">
        Vehicle category
      </ThemedText>
      <View style={styles.pills}>
        {VEHICLE_CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[
                styles.pill,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary + '15' : theme.backgroundElement,
                },
              ]}>
              <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
                {c}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ borderColor: theme.primary }}>
        <ThemedText type="smallBold">Zone eligibility</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {capacityQualification(capacityNum)}
        </ThemedText>
      </Card>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        DOCUMENTS
      </ThemedText>
      <TextField
        label="Roadworthy expiry (optional)"
        placeholder="YYYY-MM-DD"
        value={roadworthyExpiry}
        onChangeText={setRoadworthyExpiry}
        hint="Used to warn you before your roadworthy lapses."
      />
      <DocumentField label="Vehicle registration" picked={pickedReg} onChange={setPickedReg} />
      <DocumentField
        label="Roadworthy certificate"
        picked={pickedRoadworthy}
        onChange={setPickedRoadworthy}
      />

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button title="Add vehicle" loading={saving} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { letterSpacing: 1, marginTop: Spacing.two },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
