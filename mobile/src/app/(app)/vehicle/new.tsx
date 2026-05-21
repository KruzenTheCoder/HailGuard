import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useCreateVehicle, useUpdateVehicle } from '@/api/vehicles';
import { DocumentField } from '@/components/document-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { BUCKETS, uploadDocument, type PickedDocument } from '@/lib/storage';
import { useAuth } from '@/providers/auth-provider';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function NewVehicleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [roadworthyExpiry, setRoadworthyExpiry] = useState('');
  const [pickedReg, setPickedReg] = useState<PickedDocument | null>(null);
  const [pickedRoadworthy, setPickedRoadworthy] = useState<PickedDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!make.trim() || !model.trim() || !plate.trim()) {
      return 'Make, model and licence plate are required.';
    }
    const y = Number(year);
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(y) || y < 1950 || y > maxYear) {
      return `Enter a valid year between 1950 and ${maxYear}.`;
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
      <TextField
        label="Roadworthy expiry (optional)"
        placeholder="YYYY-MM-DD"
        value={roadworthyExpiry}
        onChangeText={setRoadworthyExpiry}
        hint="Used to warn you before your roadworthy lapses."
      />

      <DocumentField
        label="Vehicle registration"
        picked={pickedReg}
        onChange={setPickedReg}
      />
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
