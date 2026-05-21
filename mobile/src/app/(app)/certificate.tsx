import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useSubscriptions } from '@/api/subscriptions';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';

export default function CertificateScreen() {
  const theme = useTheme();
  const { data: subscriptions, isLoading } = useSubscriptions();

  if (isLoading) return <LoadingScreen />;

  const active = (subscriptions ?? []).filter((s) => s.status === 'active');

  if (active.length === 0) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Ionicons name="ribbon-outline" size={56} color={theme.textSecondary} />
          <ThemedText type="subtitle">No active compliance</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Subscribe an approved vehicle to a zone to receive your digital compliance certificate.
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ThemedText type="small" themeColor="textSecondary">
        Show this certificate to an inspector to verify compliance. Each QR encodes the active
        subscription details.
      </ThemedText>

      {active.map((sub) => {
        const payload = JSON.stringify({
          s: sub.id,
          plate: sub.licensePlate,
          zone: sub.zoneName,
          until: sub.endDate,
        });
        return (
          <Card key={sub.id} style={styles.cert}>
            <View style={styles.headerRow}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{sub.zoneName}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {sub.vehicleLabel} · {sub.licensePlate}
                </ThemedText>
              </View>
              <StatusBadge status={sub.status} />
            </View>

            <View style={styles.qrWrap}>
              <View style={styles.qrInner}>
                <QRCode value={payload} size={168} backgroundColor="#ffffff" color="#000000" />
              </View>
            </View>

            <View style={styles.metaRow}>
              <Meta label="Plan" value={sub.planType === 'monthly' ? 'Monthly' : 'Yearly'} />
              <Meta label="Valid until" value={formatDate(sub.endDate)} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.flex}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  cert: { gap: Spacing.three },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  flex: { flex: 1 },
  qrWrap: { alignItems: 'center' },
  qrInner: { padding: Spacing.three, backgroundColor: '#ffffff', borderRadius: Spacing.two },
  metaRow: { flexDirection: 'row', gap: Spacing.three },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  center: { textAlign: 'center' },
});
