import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StatusTileTone = 'success' | 'warning' | 'danger' | 'neutral';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint?: string;
  tone?: StatusTileTone;
  onPress?: () => void;
};

export function StatusTile({ icon, label, value, hint, tone = 'neutral', onPress }: Props) {
  const theme = useTheme();
  const toneColor =
    tone === 'success'
      ? theme.success
      : tone === 'warning'
        ? theme.warning
        : tone === 'danger'
          ? theme.danger
          : theme.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBubble, { backgroundColor: toneColor + '1A' }]}>
          <Ionicons name={icon} size={20} color={toneColor} />
        </View>
        {tone !== 'neutral' ? (
          <View style={[styles.toneDot, { backgroundColor: toneColor }]} />
        ) : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label.toUpperCase()}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.value} numberOfLines={1}>
        {value}
      </ThemedText>
      {hint ? (
        <ThemedText type="small" style={[styles.hint, { color: toneColor }]} numberOfLines={1}>
          {hint}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 132,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toneDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  value: {
    fontSize: 16,
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
