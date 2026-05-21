import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PickedDocument } from '@/lib/storage';

type DocumentFieldProps = {
  label: string;
  /** A path already stored in Supabase Storage, if any. */
  existingPath?: string | null;
  /** A freshly picked, not-yet-uploaded document. */
  picked?: PickedDocument | null;
  onChange: (doc: PickedDocument | null) => void;
  disabled?: boolean;
};

function extFromMime(mime: string | undefined): string {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('heic')) return 'heic';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

function toPicked(asset: ImagePicker.ImagePickerAsset): PickedDocument | null {
  if (!asset.base64) return null;
  const mimeType = asset.mimeType ?? 'image/jpeg';
  return { base64: asset.base64, uri: asset.uri, mimeType, ext: extFromMime(mimeType) };
}

export function DocumentField({
  label,
  existingPath,
  picked,
  onChange,
  disabled,
}: DocumentFieldProps) {
  const theme = useTheme();

  async function pickFrom(source: 'camera' | 'library') {
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', `Allow ${source} access to upload this document.`);
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.6,
              base64: true,
            });

      if (result.canceled) return;
      const doc = toPicked(result.assets[0]);
      if (!doc) {
        Alert.alert('Could not read file', 'Please try a different image.');
        return;
      }
      onChange(doc);
    } catch (e) {
      Alert.alert('Upload error', e instanceof Error ? e.message : 'Could not pick the document.');
    }
  }

  const hasDoc = !!picked || !!existingPath;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>

      <View style={[styles.box, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        {picked ? (
          <Image source={{ uri: picked.uri }} style={styles.preview} contentFit="cover" />
        ) : existingPath ? (
          <View style={styles.onFile}>
            <Ionicons name="document-attach-outline" size={28} color={theme.success} />
            <ThemedText type="small" themeColor="textSecondary">
              Document on file
            </ThemedText>
          </View>
        ) : (
          <View style={styles.onFile}>
            <Ionicons name="cloud-upload-outline" size={28} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              No document yet
            </ThemedText>
          </View>
        )}
      </View>

      {!disabled && (
        <View style={styles.actions}>
          <PickButton icon="camera-outline" label="Camera" onPress={() => pickFrom('camera')} />
          <PickButton icon="images-outline" label="Gallery" onPress={() => pickFrom('library')} />
          {hasDoc && picked && (
            <PickButton icon="close-outline" label="Clear" onPress={() => onChange(null)} danger />
          )}
        </View>
      )}
    </View>
  );
}

function PickButton({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pickBtn, { borderColor: color, opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={16} color={color} />
      <ThemedText type="small" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  box: {
    height: 140,
    borderRadius: Spacing.two,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { width: '100%', height: '100%' },
  onFile: { alignItems: 'center', gap: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
});
