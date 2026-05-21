import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ComplianceRing } from '@/components/compliance-ring';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ComplianceSummary } from '@/lib/compliance';

type Props = {
  summary: ComplianceSummary;
};

export function PassStatusCard({ summary }: Props) {
  const theme = useTheme();
  const ringColor =
    summary.level === 'compliant'
      ? theme.success
      : summary.level === 'partial'
        ? theme.warning
        : theme.danger;

  const headline =
    summary.subscriptions.primary
      ? `${summary.subscriptions.primary.zoneName} ${summary.level === 'compliant' ? 'Compliant' : 'Active'}`
      : summary.level === 'partial'
        ? 'Almost compliant'
        : 'Not compliant';

  const detail = summary.subscriptions.primary
    ? summary.subscriptions.daysUntilExpiry === null
      ? 'Active subscription'
      : summary.subscriptions.daysUntilExpiry <= 7
        ? `Renew soon — expires in ${summary.subscriptions.daysUntilExpiry} day${summary.subscriptions.daysUntilExpiry === 1 ? '' : 's'}`
        : `Pass valid for ${summary.subscriptions.daysUntilExpiry} more days`
    : 'Subscribe to a zone to activate your digital pass';

  const eyebrowIcon: keyof typeof Ionicons.glyphMap =
    summary.level === 'compliant' ? 'shield-checkmark' : 'shield-outline';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.row}>
        <View style={styles.ringWrap}>
          <ComplianceRing percent={summary.score} size={104} stroke={11} color={ringColor} />
          <View style={styles.ringLabel}>
            <ThemedText style={[styles.ringPercent, { color: ringColor }]}>
              {summary.score}%
            </ThemedText>
          </View>
        </View>
        <View style={styles.text}>
          <View style={styles.eyebrowRow}>
            <Ionicons name={eyebrowIcon} size={14} color={ringColor} />
            <ThemedText style={[styles.eyebrow, { color: ringColor }]}>
              ACTIVE PASS STATUS
            </ThemedText>
          </View>
          <ThemedText style={styles.headline} numberOfLines={2}>
            {headline}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  ringWrap: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontSize: 22,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    gap: 4,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
  },
});
