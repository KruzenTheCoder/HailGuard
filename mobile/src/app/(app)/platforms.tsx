import { E_HAILING_PLATFORMS, type EHailingPlatform, type PlatformVerifications } from '@hailguard/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useDriverProfile, useUpsertProfile } from '@/api/profile';
import { DocumentField } from '@/components/document-field';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { BUCKETS, uploadDocument, type PickedDocument } from '@/lib/storage';
import { useAuth } from '@/providers/auth-provider';

const PLATFORM_LABELS: Record<EHailingPlatform, string> = {
  uber: 'Uber',
  bolt: 'Bolt',
  indrive: 'InDrive',
};

export default function PlatformsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading } = useDriverProfile();
  const upsert = useUpsertProfile();

  const [picked, setPicked] = useState<Partial<Record<EHailingPlatform, PickedDocument | null>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!user) return;

    const hasAny = E_HAILING_PLATFORMS.some((p) => picked[p]);
    if (!hasAny) {
      setError('Add at least one proof of platform activity, or go back.');
      return;
    }

    setSaving(true);
    try {
      const next: PlatformVerifications = { ...(profile?.platformVerifications ?? {}) };
      for (const platform of E_HAILING_PLATFORMS) {
        const doc = picked[platform];
        if (!doc) continue;
        const path = await uploadDocument(
          BUCKETS.driver,
          `${user.id}/platform_${platform}.${doc.ext}`,
          doc
        );
        next[platform] = { status: 'pending', proofPath: path };
      }
      await upsert.mutateAsync({ platformVerifications: next });
      Alert.alert('Submitted', 'Your platform proof has been submitted for review.');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit verification.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <Screen scroll>
      <ThemedText type="small" themeColor="textSecondary">
        Upload a screenshot of your active driver dashboard or trip history for each platform you
        operate on.
      </ThemedText>

      {E_HAILING_PLATFORMS.map((platform) => {
        const existing = profile?.platformVerifications?.[platform];
        return (
          <Card key={platform}>
            <View style={styles.header}>
              <ThemedText type="smallBold">{PLATFORM_LABELS[platform]}</ThemedText>
              {existing ? <StatusBadge status={existing.status} /> : null}
            </View>
            <DocumentField
              label="Proof of activity"
              existingPath={existing?.proofPath ?? null}
              picked={picked[platform] ?? null}
              onChange={(doc) => setPicked((prev) => ({ ...prev, [platform]: doc }))}
            />
          </Card>
        );
      })}

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button title="Submit for verification" loading={saving} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
