import { ChevronRight, Clock, Download, Trash2 } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { palette, radii, spacing } from '@/constants/theme';
import { localFileExists } from '@/lib/files';
import { formatRelativeDate, getHostname } from '@/lib/format';
import type { HistoryRecord } from '@/types/build';
import { AppText } from './AppText';
import { BuildStatusBadge } from './Badge';

type HistoryCardProps = {
  record: HistoryRecord;
  onOpen: () => void;
  onDelete: () => void;
};

export function HistoryCard({ record, onOpen, onDelete }: HistoryCardProps) {
  const hasApk = localFileExists(record.apkUri);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Buka build ${record.appName}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <Image source={{ uri: record.logoUri }} style={styles.logo} />
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
              {record.appName}
            </AppText>
            <BuildStatusBadge status={record.status} />
          </View>
          <AppText variant="caption" color={palette.muted} numberOfLines={1}>
            {getHostname(record.url)}
          </AppText>
          <View style={styles.metaRow}>
            <Clock color={palette.faint} size={12} strokeWidth={2} />
            <AppText variant="labelSmall" color={palette.faint}>
              {formatRelativeDate(record.createdAt)}
            </AppText>
            {hasApk ? (
              <>
                <View style={styles.metaDot} />
                <Download color={palette.success} size={12} strokeWidth={2.2} />
                <AppText variant="labelSmall" color={palette.success}>
                  APK TERSIMPAN
                </AppText>
              </>
            ) : null}
          </View>
        </View>
        <ChevronRight color={palette.faint} size={17} strokeWidth={2.2} />
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <AppText variant="labelSmall" color={palette.primary}>
            BUKA BUILD
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hapus build ${record.appName}`}
          onPress={onDelete}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Trash2 color={palette.danger} size={13} strokeWidth={2.1} />
          <AppText variant="labelSmall" color={palette.danger}>
            HAPUS
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    overflow: 'hidden',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: palette.primarySoft,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.borderStrong,
    marginHorizontal: 2,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
});
