import { ScrollView, StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shown by the root layout when EXPO_PUBLIC_SUPABASE_URL or
 * EXPO_PUBLIC_SUPABASE_ANON_KEY are missing from mobile/.env.
 */
export function SetupRequiredScreen() {
  const theme = useTheme();
  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <BrandLogo height={96} />
      <ThemedText type="title" style={styles.heading}>
        Configure your environment
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        The Driver Hub can&apos;t reach Supabase because{' '}
        <ThemedText style={styles.inlineBold}>mobile/.env</ThemedText> is missing the
        required keys.
      </ThemedText>
      <View style={[styles.codeBlock, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" style={styles.code}>
          EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co{'\n'}
          EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
        </ThemedText>
      </View>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        Copy <ThemedText style={styles.inlineBold}>mobile/.env.example</ThemedText> to{' '}
        <ThemedText style={styles.inlineBold}>mobile/.env</ThemedText>, paste your
        Supabase project&apos;s URL and anon key (Project Settings → API), then
        restart the dev server with{' '}
        <ThemedText style={styles.inlineBold}>expo start -c</ThemedText> to clear the
        bundle cache.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  heading: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
  codeBlock: {
    width: '100%',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  code: {
    fontFamily: 'Courier',
  },
  inlineBold: {
    fontWeight: '700',
  },
});
