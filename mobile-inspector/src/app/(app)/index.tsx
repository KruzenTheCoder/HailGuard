import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLookup, type LookupKind } from '@/api/inspector';
import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

const NAVY = '#0D2236';
const ACCENT = '#27D07F';
const MUTED = '#9BB0C2';

function extractSubscriptionId(qr: string): string | null {
  const m = qr.match(/\/verify\/([0-9a-fA-F-]{36})/);
  if (m) return m[1];
  if (/^[0-9a-fA-F-]{36}$/.test(qr.trim())) return qr.trim();
  return null;
}

export default function InspectHome() {
  const theme = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const lookup = useLookup();

  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  const [manualValue, setManualValue] = useState('');

  async function runLookup(kind: LookupKind, value: string) {
    try {
      const dossier = await lookup.mutateAsync({ kind, value });
      if (!dossier) {
        Alert.alert('Not found', 'No driver matches that pass / plate / ID.');
        return;
      }
      router.push({ pathname: '/dossier', params: { driverId: dossier.driverId } });
    } catch (e) {
      Alert.alert('Lookup failed', e instanceof Error ? e.message : 'Try again.');
    }
  }

  async function startScan() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera needed', 'Allow camera access to scan Zone Pass QR codes.');
        return;
      }
    }
    handled.current = false;
    setScanning(true);
  }

  function onScan(data: string) {
    if (handled.current) return;
    handled.current = true;
    setScanning(false);
    const subId = extractSubscriptionId(data);
    if (!subId) {
      Alert.alert('Unrecognised code', 'That QR is not a HailGuard Zone Pass.');
      return;
    }
    void runLookup('subscription', subId);
  }

  if (scanning) {
    return (
      <View style={styles.scanRoot}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => onScan(data)}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.reticle} />
          <ThemedText type="smallBold" style={styles.scanHint}>
            Point at the driver&apos;s Zone Pass QR
          </ThemedText>
          <Button title="Cancel" variant="secondary" onPress={() => setScanning(false)} />
        </View>
      </View>
    );
  }

  const officerName =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
    user?.email ??
    'Officer';

  return (
    <View style={[styles.root, { backgroundColor: NAVY }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Hero — mirrors the driver Home hero. */}
          <View style={styles.hero}>
            <View style={styles.heroRow}>
              <View style={styles.logoChip}>
                <BrandLogo height={44} />
              </View>
              <View style={styles.heroText}>
                <ThemedText style={styles.heroEyebrow}>HAILGUARD</ThemedText>
                <ThemedText style={styles.heroTitle}>Inspector Hub</ThemedText>
              </View>
            </View>
            <View style={styles.heroBottom}>
              <View style={styles.greetingBlock}>
                <ThemedText style={styles.greetingLabel}>Signed in as</ThemedText>
                <ThemedText style={styles.greetingName} numberOfLines={1}>
                  {officerName}
                </ThemedText>
              </View>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <ThemedText style={styles.statusText}>ON DUTY</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.body}>
            {/* Primary action — lifted to overlap the hero, like the driver pass card. */}
            <View
              style={[
                styles.scanCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}>
              <View
                style={[
                  styles.scanIconWrap,
                  { backgroundColor: theme.backgroundSelected },
                ]}>
                <Ionicons name="qr-code-outline" size={36} color={theme.primary} />
              </View>
              <ThemedText style={styles.scanTitle}>Scan a Zone Pass</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.scanCopy}>
                Point your camera at the driver&apos;s digital pass QR to validate them in
                seconds.
              </ThemedText>
              <Button
                title="Open scanner"
                onPress={startScan}
                loading={lookup.isPending}
                style={styles.scanBtn}
              />
            </View>

            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={styles.sectionLabel}>
              MANUAL LOOKUP
            </ThemedText>

            <View
              style={[
                styles.lookupCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.lookupHeader}>
                <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.lookupHint}>
                  Search by licence plate, SA ID number, or pass reference — we check all three.
                </ThemedText>
              </View>
              <TextField
                placeholder="Plate, ID number or pass reference"
                autoCapitalize="characters"
                value={manualValue}
                onChangeText={setManualValue}
              />
              <Button
                title="Look up"
                loading={lookup.isPending}
                disabled={!manualValue.trim()}
                onPress={() => runLookup('auto', manualValue.trim())}
              />
            </View>

            <Button
              title="Sign out"
              variant="outline"
              onPress={signOut}
              style={styles.signOut}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: Spacing.five },

  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five + Spacing.three,
    gap: Spacing.four,
  },
  heroRow: {
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
  heroText: { flex: 1 },
  heroEyebrow: {
    color: ACCENT,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  greetingBlock: { flex: 1, gap: 2 },
  greetingLabel: {
    color: MUTED,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  greetingName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ACCENT,
    backgroundColor: ACCENT + '22',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  statusText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: 0,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  scanCard: {
    // Lift the scan card to overlap the navy hero, mirroring the driver layout.
    marginTop: -(Spacing.five + Spacing.one),
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  scanIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scanCopy: { textAlign: 'center', paddingHorizontal: Spacing.two },
  scanBtn: { alignSelf: 'stretch', marginTop: Spacing.two },

  sectionLabel: {
    letterSpacing: 1.5,
    marginTop: Spacing.two,
  },
  lookupCard: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  lookupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  lookupHint: { flex: 1 },

  signOut: { marginTop: Spacing.three },

  scanRoot: { flex: 1, backgroundColor: '#000' },
  scanOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
  reticle: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: ACCENT,
    borderRadius: 24,
  },
  scanHint: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
