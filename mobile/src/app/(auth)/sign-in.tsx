import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Mode = 'password' | 'otp';
type Channel = 'email' | 'phone';

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('password');
  const [channel, setChannel] = useState<Channel>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function signInWithPassword() {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    // The auth listener flips the session; the root navigator swaps to (app).
  }

  async function sendCode() {
    setError(null);
    const value = (channel === 'email' ? email : phone).trim();
    if (!value) {
      setError(channel === 'email' ? 'Enter your email address.' : 'Enter your phone number.');
      return;
    }

    setLoading(true);
    const { error: otpError } =
      channel === 'email'
        ? await supabase.auth.signInWithOtp({ email: value })
        : await supabase.auth.signInWithOtp({ phone: value });
    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }
    router.push({ pathname: '/verify', params: { channel, value } });
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <BrandLogo height={120} />
        <ThemedText type="default" themeColor="textSecondary">
          Stay compliant in your operating zone.
        </ThemedText>
      </View>

      {mode === 'password' ? (
        <>
          <TextField
            label="Email address"
            placeholder="you@example.com"
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
          <Button title="Sign in" loading={loading} onPress={signInWithPassword} />
          <Pressable onPress={() => switchMode('otp')}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.altLink}>
              Sign in with email code instead
            </ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
            {(['email', 'phone'] as const).map((c) => {
              const active = channel === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    setChannel(c);
                    setError(null);
                  }}
                  style={[
                    styles.toggleItem,
                    active && { backgroundColor: theme.background },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    themeColor={active ? 'text' : 'textSecondary'}
                    style={styles.toggleLabel}>
                    {c === 'email' ? 'Email' : 'Phone'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {channel === 'email' ? (
            <TextField
              label="Email address"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              error={error}
            />
          ) : (
            <TextField
              label="Phone number"
              placeholder="+27 82 000 0000"
              autoComplete="tel"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={error}
              hint="Use international format, e.g. +27821234567"
            />
          )}

          <Button title="Send verification code" loading={loading} onPress={sendCode} />
          <Pressable onPress={() => switchMode('password')}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.altLink}>
              Use password instead
            </ThemedText>
          </Pressable>
        </>
      )}

      <ThemedText type="small" themeColor="textSecondary" style={styles.legal}>
        {mode === 'password'
          ? "Don't have an account yet? Use the email code option above to sign up."
          : "We'll send a one-time code to verify it's you. New here? An account is created automatically."}
      </ThemedText>
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
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: Spacing.half,
  },
  toggleItem: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two - 1,
    alignItems: 'center',
  },
  toggleLabel: {
    textAlign: 'center',
  },
  altLink: {
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  legal: {
    textAlign: 'center',
  },
});
