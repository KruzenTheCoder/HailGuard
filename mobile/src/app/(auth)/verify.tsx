import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ channel: string; value: string }>();
  const channel = params.channel === 'phone' ? 'phone' : 'email';
  const value = params.value ?? '';

  // Reached here without first requesting a code — send the user back to
  // sign-in so they don't sit on a dead "enter code" screen.
  if (!value) {
    return <Redirect href="/sign-in" />;
  }

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setError(null);
    const token = code.trim();
    if (token.length < 6) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }

    setLoading(true);
    const { error: verifyError } =
      channel === 'email'
        ? await supabase.auth.verifyOtp({ email: value, token, type: 'email' })
        : await supabase.auth.verifyOtp({ phone: value, token, type: 'sms' });
    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    // On success the auth listener flips the session and the root navigator
    // swaps to the (app) group automatically.
  }

  async function resend() {
    setError(null);
    setResending(true);
    const { error: otpError } =
      channel === 'email'
        ? await supabase.auth.signInWithOtp({ email: value })
        : await supabase.auth.signInWithOtp({ phone: value });
    setResending(false);
    if (otpError) setError(otpError.message);
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Enter code</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          We sent a 6-digit code to {value}.
        </ThemedText>
      </View>

      <TextField
        label="Verification code"
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        error={error}
      />

      <Button title="Verify" loading={loading} onPress={verify} />
      <Button title="Resend code" variant="secondary" loading={resending} onPress={resend} />
      <Button title="Back" variant="outline" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
});
