import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { useReportIncident } from '@/api/incidents';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Persistent panic button. Logs an `sos_triggered` incident that surfaces in
 * the admin Incident Command Center. Future: pair with a physical in-vehicle
 * button over Bluetooth/BLE and call the same report path.
 */
export function SosButton({ vehicleId }: { vehicleId?: string | null }) {
  const theme = useTheme();
  const report = useReportIncident();

  function trigger() {
    Alert.alert(
      'Trigger SOS?',
      'This alerts HailGuard operations immediately. Only use in a genuine emergency.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              await report.mutateAsync({ type: 'sos_triggered', vehicleId });
              Alert.alert('SOS sent', 'Operations has been alerted. Stay safe.');
            } catch (e) {
              Alert.alert('Could not send SOS', e instanceof Error ? e.message : 'Try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Trigger emergency SOS"
      onPress={trigger}
      disabled={report.isPending}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: theme.danger, opacity: report.isPending ? 0.6 : pressed ? 0.85 : 1 },
      ]}>
      <Ionicons name="warning" size={22} color="#FFFFFF" />
      <ThemedText type="smallBold" style={styles.label}>
        {report.isPending ? 'Sending…' : 'SOS / Panic'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 52,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  label: { color: '#FFFFFF', letterSpacing: 0.5 },
});
