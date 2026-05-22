import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const NAVY = '#0D2236';

export default function InspectorSignIn() {
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
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.header}>
            <BrandLogo height={64} />
            <ThemedText type="small" style={styles.tag}>
              INSPECTOR · COMPLIANCE FIELD UNIT
            </ThemedText>
          </View>

          <View style={styles.form}>
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
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={error}
            />
            <Button title="Sign in" loading={loading} onPress={signIn} />
            <ThemedText type="small" style={styles.note}>
              Accounts are issued by HailGuard administrators.
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four, gap: Spacing.six },
  header: { alignItems: 'center', gap: Spacing.two },
  tag: { color: '#7FE0AC', letterSpacing: 2 },
  form: { gap: Spacing.three },
  note: { color: '#9BB0C2', textAlign: 'center' },
});
