import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ComplianceRing } from '@/components/compliance-ring';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SubscriptionView } from '@/api/subscriptions';
import type { ComplianceSummary } from '@/lib/compliance';

type Props = {
  summary: ComplianceSummary;
};

const MS_PER_DAY = 86_400_000;

function daysLeft(sub: SubscriptionView): number | null {
  if (!sub.endDate) return null;
  return Math.max(0, Math.ceil((Date.parse(sub.endDate) - Date.now()) / MS_PER_DAY));
}

export function PassStatusCard({ summary }: Props) {
  const theme = useTheme();
  const ringColor =
    summary.level === 'compliant'
      ? theme.success
      : summary.level === 'partial'
        ? theme.warning
        : theme.danger;

  const { active, activeCount, primary, daysUntilExpiry } = summary.subscriptions;
  const multiPass = activeCount > 1;

  const eyebrow = multiPass
    ? `${activeCount} ACTIVE PASSES`
    : 'ACTIVE PASS STATUS';

  const headline = !primary
    ? summary.level === 'partial'
      ? 'Almost compliant'
      : 'Not compliant'
    : multiPass
      ? 'Multi-zone pass active'
      : `${primary.zoneName} ${summary.level === 'compliant' ? 'Compliant' : 'Active'}`;

  const detail = !primary
    ? 'Subscribe to a zone to activate your digital pass'
    : multiPass
      ? daysUntilExpiry === null
        ? `${activeCount} zones covered`
        : `Next renewal: ${primary.zoneName} in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`
      : daysUntilExpiry === null
        ? 'Active subscription'
        : daysUntilExpiry <= 7
          ? `Renew soon — expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`
          : `Pass valid for ${daysUntilExpiry} more days`;

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
              {eyebrow}
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

      {multiPass ? (
        <View style={[styles.chipRow, { borderTopColor: theme.border }]}>
          {active.map((sub) => {
            const days = daysLeft(sub);
            const pillColor =
              days === null
                ? theme.textSecondary
                : days <= 7
                  ? theme.danger
                  : days <= 30
                    ? theme.warning
                    : theme.success;
            return (
              <View
                key={sub.id}
                style={[styles.chip, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <ThemedText style={styles.chipZone} numberOfLines={1}>
                  {sub.zoneName}
                </ThemedText>
                <View style={[styles.chipPill, { backgroundColor: pillColor + '22' }]}>
                  <ThemedText style={[styles.chipPillText, { color: pillColor }]}>
                    {days === null ? 'Active' : `${days}d`}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipZone: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
