import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useVehicles } from '@/api/vehicles';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function GarageScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: vehicles, isLoading, isRefetching, refetch, error } = useVehicles();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <FlatList
        data={vehicles ?? []}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
        }
        ListHeaderComponent={
          <Button title="Add a vehicle" onPress={() => router.push('/vehicle/new')} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="car-sport-outline" size={48} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                {error
                  ? 'Could not load your vehicles. Pull to retry.'
                  : 'No vehicles yet. Add one to start the compliance process.'}
              </ThemedText>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/vehicle/${item.id}`)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Card>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">
                    {item.make} {item.model}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.year} · {item.licensePlate}
                  </ThemedText>
                </View>
                <StatusBadge status={item.status} />
              </View>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six },
  center: { textAlign: 'center' },
});
