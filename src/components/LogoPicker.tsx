import { CheckCircle2, ImagePlus, Trash2, UploadCloud } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { palette, radii, spacing } from '@/constants/theme';
import { AppText } from './AppText';

type LogoPickerProps = {
  logoUri: string | null;
  onPick: () => void;
  onRemove: () => void;
  isProcessing?: boolean;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function LogoPicker({
  logoUri,
  onPick,
  onRemove,
  isProcessing = false,
  error,
  style,
}: LogoPickerProps) {
  return (
    <View style={style}>
      {logoUri ? (
        <View style={[styles.previewCard, error && styles.errored]}>
          <Image source={{ uri: logoUri }} style={styles.logo} />
          <View style={styles.previewInfo}>
            <View style={styles.readyRow}>
              <CheckCircle2 color={palette.success} size={15} strokeWidth={2.3} />
              <AppText variant="bodyStrong" color={palette.success}>
                Logo siap
              </AppText>
            </View>
            <AppText variant="caption" color={palette.muted}>
              Dipotong persegi 512 × 512 px
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ganti logo"
              disabled={isProcessing}
              onPress={onPick}
              style={({ pressed }) => [styles.replaceButton, pressed && styles.pressed]}
            >
              <ImagePlus color={palette.primary} size={14} strokeWidth={2.2} />
              <AppText variant="bodyStrong" color={palette.primary} style={styles.replaceText}>
                Ganti logo
              </AppText>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hapus logo"
            hitSlop={8}
            onPress={onRemove}
            style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
          >
            <Trash2 color={palette.danger} size={17} strokeWidth={2} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pilih logo aplikasi"
          disabled={isProcessing}
          onPress={onPick}
          style={({ pressed }) => [
            styles.picker,
            error && styles.errored,
            pressed && styles.pickerPressed,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color={palette.primary} size="small" />
          ) : (
            <View style={styles.uploadIcon}>
              <UploadCloud color={palette.primary} size={25} strokeWidth={2} />
            </View>
          )}
          <AppText variant="bodyStrong">
            {isProcessing ? 'Memproses logo…' : 'Pilih logo aplikasi'}
          </AppText>
          <AppText variant="caption" color={palette.muted} align="center">
            PNG atau JPG · maksimal 2 MB
          </AppText>
        </Pressable>
      )}

      {error ? (
        <AppText variant="caption" color={palette.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    minHeight: 178,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: spacing.xl,
  },
  pickerPressed: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  uploadIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.md,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: palette.primarySoft,
  },
  previewInfo: {
    flex: 1,
    gap: 3,
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  replaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingVertical: 2,
  },
  replaceText: {
    fontSize: 13,
    lineHeight: 18,
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: palette.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  errored: {
    borderColor: palette.danger,
  },
  error: {
    marginTop: 7,
    marginLeft: 2,
  },
});
