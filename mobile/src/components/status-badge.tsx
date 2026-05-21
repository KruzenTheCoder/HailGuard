import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

const STATUS_TONE: Record<string, Tone> = {
  approved: 'success',
  active: 'success',
  pending: 'warning',
  pending_payment: 'warning',
  rejected: 'danger',
  suspended: 'danger',
  expired: 'danger',
  cancelled: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  pending_payment: 'Payment due',
  approved: 'Approved',
  active: 'Active',
  rejected: 'Rejected',
  suspended: 'Suspended',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }: { status: string }) {
  const theme = useTheme();
  const tone = STATUS_TONE[status] ?? 'neutral';
  const color =
    tone === 'success'
      ? theme.success
      : tone === 'warning'
        ? theme.warning
        : tone === 'danger'
          ? theme.danger
          : theme.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="small" style={{ color }}>
        {STATUS_LABEL[status] ?? status}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 7, height: 7, borderRadius: 999 },
});
