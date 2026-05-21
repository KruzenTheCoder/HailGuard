import type { PlanType } from '@hailguard/shared';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useCheckout } from '@/api/subscriptions';
import { useVehicles } from '@/api/vehicles';
import { useZone } from '@/api/zones';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatZAR } from '@/lib/format';

export default function SubscribeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>();
  const { data: zone, isLoading: zoneLoading } = useZone(zoneId);
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const checkout = useCheckout();

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanType>('monthly');
  const [error, setError] = useState<string | null>(null);

  if (zoneLoading || vehiclesLoading) return <LoadingScreen />;
  if (!zone) {
    return (
      <Screen>
        <ThemedText type="default">Zone not found.</ThemedText>
      </Screen>
    );
  }

  const eligibleVehicles = (vehicles ?? []).filter((v) => v.status === 'active');
  const amount = plan === 'monthly' ? zone.monthlyFee : zone.yearlyFee;

  async function pay() {
    setError(null);
    if (!vehicleId) {
      setError('Select a vehicle to subscribe.');
      return;
    }
    try {
      await checkout.mutateAsync({
        vehicleId,
        zoneId: zone!.id,
        planType: plan,
        amount,
      });
      Alert.alert('Subscription active', `Your vehicle is now compliant in ${zone!.name}.`);
      router.replace('/certificate');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed. Please try again.');
    }
  }

  return (
    <Screen scroll>
      <Card>
        <ThemedText type="smallBold">{zone.name}</ThemedText>
        {zone.description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {zone.description}
          </ThemedText>
        ) : null}
      </Card>

      <ThemedText type="smallBold" themeColor="textSecondary">
        CHOOSE A PLAN
      </ThemedText>
      <View style={styles.plans}>
        {(['monthly', 'yearly'] as const).map((p) => {
          const active = plan === p;
          const price = p === 'monthly' ? zone.monthlyFee : zone.yearlyFee;
          return (
            <Pressable
              key={p}
              onPress={() => setPlan(p)}
              style={({ pressed }) => [
                styles.plan,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary + '11' : theme.backgroundElement,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText type="smallBold">{p === 'monthly' ? 'Monthly' : 'Yearly'}</ThemedText>
              <ThemedText type="default">{formatZAR(price)}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="smallBold" themeColor="textSecondary">
        SELECT VEHICLE
      </ThemedText>
      {eligibleVehicles.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            You have no approved vehicles. A vehicle must be approved before it can be subscribed to
            a zone.
          </ThemedText>
          <Button
            title="Go to garage"
            variant="secondary"
            style={styles.gap}
            onPress={() => router.push('/garage')}
          />
        </Card>
      ) : (
        eligibleVehicles.map((v) => {
          const selected = vehicleId === v.id;
          return (
            <Pressable key={v.id} onPress={() => setVehicleId(v.id)}>
              <Card style={selected ? { borderColor: theme.primary } : undefined}>
                <View style={styles.vehicleRow}>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">
                      {v.make} {v.model}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {v.licensePlate}
                    </ThemedText>
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? theme.primary : theme.textSecondary}
                  />
                </View>
              </Card>
            </Pressable>
          );
        })
      )}

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button
        title={`Pay ${formatZAR(amount)} & subscribe`}
        loading={checkout.isPending}
        disabled={eligibleVehicles.length === 0}
        onPress={pay}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Payments are simulated in this build (no real charge).
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  plans: { flexDirection: 'row', gap: Spacing.three },
  plan: { flex: 1, borderWidth: 1, borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.half },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
  gap: { marginTop: Spacing.two },
  center: { textAlign: 'center' },
});
