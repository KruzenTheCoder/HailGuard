import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useDriverProfile, useUpsertProfile } from '@/api/profile';
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

export default function ProfileEditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading } = useDriverProfile();
  const upsert = useUpsertProfile();

  const [idNumber, setIdNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [pickedId, setPickedId] = useState<PickedDocument | null>(null);
  const [pickedLicense, setPickedLicense] = useState<PickedDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setIdNumber(profile.idNumber ?? '');
      setLicenseNumber(profile.licenseNumber ?? '');
    }
  }, [profile]);

  async function save() {
    setError(null);
    if (!user) {
      setError('You are not signed in.');
      return;
    }
    if (!idNumber.trim() || !licenseNumber.trim()) {
      setError('Enter both your ID number and licence number.');
      return;
    }

    setSaving(true);
    try {
      let idPath = profile?.idDocumentPath ?? null;
      let licensePath = profile?.licenseDocumentPath ?? null;

      if (pickedId) {
        idPath = await uploadDocument(
          BUCKETS.driver,
          `${user.id}/id_document.${pickedId.ext}`,
          pickedId
        );
      }
      if (pickedLicense) {
        licensePath = await uploadDocument(
          BUCKETS.driver,
          `${user.id}/drivers_license.${pickedLicense.ext}`,
          pickedLicense
        );
      }

      await upsert.mutateAsync({
        idNumber: idNumber.trim(),
        licenseNumber: licenseNumber.trim(),
        idDocumentPath: idPath,
        licenseDocumentPath: licensePath,
      });

      Alert.alert('Saved', 'Your profile has been submitted for review.');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <Screen scroll>
      {profile && (
        <View style={styles.statusRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Profile status
          </ThemedText>
          <StatusBadge status={profile.status} />
        </View>
      )}

      {profile?.status === 'rejected' && profile.reviewNote ? (
        <Card style={{ borderColor: theme.danger }}>
          <ThemedText type="smallBold" themeColor="danger">
            Action needed
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profile.reviewNote}
          </ThemedText>
        </Card>
      ) : null}

      <TextField
        label="South African ID number"
        placeholder="e.g. 9001015800086"
        keyboardType="number-pad"
        maxLength={13}
        value={idNumber}
        onChangeText={setIdNumber}
      />
      <TextField
        label="Driver's licence number"
        placeholder="Licence number"
        autoCapitalize="characters"
        value={licenseNumber}
        onChangeText={setLicenseNumber}
      />

      <DocumentField
        label="ID document"
        existingPath={profile?.idDocumentPath}
        picked={pickedId}
        onChange={setPickedId}
      />
      <DocumentField
        label="Driver's licence"
        existingPath={profile?.licenseDocumentPath}
        picked={pickedLicense}
        onChange={setPickedLicense}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/platforms')}
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
        <Card>
          <View style={styles.linkRow}>
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} />
            <View style={styles.linkText}>
              <ThemedText type="smallBold">Platform verification</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Verify your Uber, Bolt and InDrive status
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </View>
        </Card>
      </Pressable>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button title="Save profile" loading={saving} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  linkText: { flex: 1, gap: Spacing.half },
});
