import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useDriverProfile } from '@/api/profile';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: profile } = useDriverProfile();

  return (
    <Screen scroll>
      <Card>
        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={40} color={theme.primary} />
          <View style={styles.identity}>
            <ThemedText type="smallBold">{user?.email ?? user?.phone ?? 'Driver'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Account ID: {user?.id?.slice(0, 8) ?? '—'}
            </ThemedText>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold">Driver profile</ThemedText>
          {profile ? <StatusBadge status={profile.status} /> : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {profile
            ? 'Keep your ID, licence and platform verification up to date.'
            : 'Add your ID and licence details, and verify your e-hailing platform status to get started.'}
        </ThemedText>
        <Button
          title={profile ? 'Edit profile' : 'Complete profile'}
          variant="secondary"
          style={styles.button}
          onPress={() => router.push('/profile-edit')}
        />
      </Card>

      <Button title="Sign out" variant="outline" onPress={signOut} style={styles.signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  identity: { flex: 1, gap: Spacing.half },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: { marginTop: Spacing.two },
  signOut: { marginTop: Spacing.two },
});
