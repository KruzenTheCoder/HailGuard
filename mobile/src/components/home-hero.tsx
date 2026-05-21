import { StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

const NAVY = '#0D2236';
const ACCENT = '#27D07F';
const MUTED = '#9BB0C2';

type HomeHeroProps = {
  greetingName: string;
  /** Right-side badge label, e.g. "94% compliant". */
  badge?: string;
  /** Tone for the badge — defaults to the brand green. */
  badgeTone?: 'success' | 'warning' | 'danger';
};

export function HomeHero({ greetingName, badge, badgeTone = 'success' }: HomeHeroProps) {
  const badgeColor =
    badgeTone === 'success' ? '#27D07F' : badgeTone === 'warning' ? '#F5A623' : '#FF6369';

  return (
    <View style={styles.hero}>
      <View style={styles.row}>
        <View style={styles.logoChip}>
          <BrandLogo height={44} />
        </View>
        <View style={styles.text}>
          <ThemedText style={styles.eyebrow}>HAILGUARD</ThemedText>
          <ThemedText style={styles.title}>Driver Hub</ThemedText>
        </View>
      </View>
      <View style={styles.bottom}>
        <View style={styles.greetingBlock}>
          <ThemedText style={styles.greetingLabel}>Welcome back</ThemedText>
          <ThemedText style={styles.greetingName} numberOfLines={1}>
            {greetingName}
          </ThemedText>
        </View>
        {badge ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeColor + '22', borderColor: badgeColor },
            ]}>
            <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
            <ThemedText style={[styles.badgeText, { color: badgeColor }]}>{badge}</ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five + Spacing.three,
    gap: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  logoChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  text: {
    flex: 1,
  },
  eyebrow: {
    color: ACCENT,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  greetingBlock: {
    flex: 1,
    gap: 2,
  },
  greetingLabel: {
    color: MUTED,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  greetingName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
