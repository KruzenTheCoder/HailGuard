import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useZones } from '@/api/zones';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency } from '@/lib/format';

export default function ZonesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: zones, isLoading, isRefetching, refetch, error } = useZones();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <FlatList
        data={zones ?? []}
        keyExtractor={(z) => z.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={48} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                {error ? 'Could not load zones. Pull to retry.' : 'No active zones available yet.'}
              </ThemedText>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/subscribe/${item.id}`)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Card>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{item.name}</ThemedText>
                  {item.description ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.description}
                    </ThemedText>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </View>
              <View style={styles.fees}>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatCurrency(item.monthlyFee, item.currency)}/mo
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatCurrency(item.yearlyFee, item.currency)}/yr
                </ThemedText>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  fees: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.one },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six },
  center: { textAlign: 'center' },
});
