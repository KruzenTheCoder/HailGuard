import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Channel = 'email' | 'phone';

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>('email');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setError(channel === 'email' ? 'Enter your email address.' : 'Enter your phone number.');
      return;
    }

    setLoading(true);
    const { error: otpError } =
      channel === 'email'
        ? await supabase.auth.signInWithOtp({ email: trimmed })
        : await supabase.auth.signInWithOtp({ phone: trimmed });
    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    router.push({ pathname: '/verify', params: { channel, value: trimmed } });
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText type="title">HailGuard</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          Stay compliant in your operating zone.
        </ThemedText>
      </View>

      <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
        {(['email', 'phone'] as const).map((c) => {
          const active = channel === c;
          return (
            <Pressable
              key={c}
              onPress={() => {
                setChannel(c);
                setValue('');
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
          value={value}
          onChangeText={setValue}
          error={error}
        />
      ) : (
        <TextField
          label="Phone number"
          placeholder="+27 82 000 0000"
          autoComplete="tel"
          keyboardType="phone-pad"
          value={value}
          onChangeText={setValue}
          error={error}
          hint="Use international format, e.g. +27821234567"
        />
      )}

      <Button title="Send verification code" loading={loading} onPress={sendCode} />

      <ThemedText type="small" themeColor="textSecondary" style={styles.legal}>
        We&apos;ll send a one-time code to verify it&apos;s you. New here? An account is created
        automatically.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
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
  legal: {
    textAlign: 'center',
  },
});
