import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const NAVY = '#0D2236';
const ACCENT = '#27D07F';
const MUTED = '#9BB0C2';

export default function InspectorSignIn() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) setError(signInError.message);
    // On success the auth listener flips the session → (app) group loads.
  }

  return (
    <View style={[styles.root, { backgroundColor: NAVY }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.logoChip}>
                <BrandLogo height={120} />
              </View>
              <ThemedText style={styles.eyebrow}>
                INSPECTOR · COMPLIANCE FIELD UNIT
              </ThemedText>
              <ThemedText style={styles.title}>Officer sign-in</ThemedText>
              <ThemedText style={styles.subtitle}>
                Authenticate to verify Zone Pass holders in the field.
              </ThemedText>
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}>
              <TextField
                label="Officer email"
                placeholder="officer@hailguard.zone"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextField
                label="Password"
                placeholder="••••••••"
                autoCapitalize="none"
                autoComplete="current-password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                error={error}
              />
              <Button title="Sign in" loading={loading} onPress={signIn} />
            </View>

            <ThemedText style={styles.note}>
              Accounts are issued by HailGuard administrators.
            </ThemedText>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.four,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  eyebrow: {
    color: ACCENT,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  note: {
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
  },
});
