import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useLookup, type LookupKind } from '@/api/inspector';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

function extractSubscriptionId(qr: string): string | null {
  const m = qr.match(/\/verify\/([0-9a-fA-F-]{36})/);
  if (m) return m[1];
  if (/^[0-9a-fA-F-]{36}$/.test(qr.trim())) return qr.trim();
  return null;
}

export default function InspectHome() {
  const theme = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
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

  return (
    <Screen scroll>
      <Card>
        <View style={styles.scanCard}>
          <Ionicons name="qr-code-outline" size={40} color={theme.primary} />
          <ThemedText type="smallBold">Scan a Zone Pass</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Validate a driver instantly by scanning the QR on their digital pass.
          </ThemedText>
          <Button
            title="Scan QR code"
            onPress={startScan}
            loading={lookup.isPending}
            style={styles.scanBtn}
          />
        </View>
      </Card>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        NO QR? LOOK UP MANUALLY
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Search by licence plate, SA ID number, or pass reference — we check all three.
      </ThemedText>
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

      <Button title="Sign out" variant="outline" onPress={signOut} style={styles.signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scanCard: { alignItems: 'center', gap: Spacing.two },
  scanBtn: { alignSelf: 'stretch', marginTop: Spacing.two },
  center: { textAlign: 'center' },
  section: { letterSpacing: 1, marginTop: Spacing.two },
  toggle: { flexDirection: 'row', gap: Spacing.two },
  toggleItem: { flex: 1, borderWidth: 1, borderRadius: Spacing.two, paddingVertical: Spacing.two, alignItems: 'center' },
  signOut: { marginTop: Spacing.four },
  scanRoot: { flex: 1, backgroundColor: '#000' },
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.four, padding: Spacing.four },
  reticle: { width: 240, height: 240, borderWidth: 3, borderColor: '#16BE66', borderRadius: 24 },
  scanHint: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
});
