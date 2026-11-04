import { StyleSheet, View } from 'react-native';
import { palette, radii } from '@/constants/theme';
import type { BuildStatus } from '@/types/build';
import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  showDot?: boolean;
};

const toneStyles: Record<BadgeTone, { background: string; text: string; dot: string }> = {
  neutral: {
    background: palette.surfaceMuted,
    text: palette.textSecondary,
    dot: palette.faint,
  },
  info: {
    background: palette.primarySoft,
    text: palette.primaryDark,
    dot: palette.primary,
  },
  success: {
    background: palette.successSoft,
    text: palette.success,
    dot: palette.success,
  },
  warning: {
    background: palette.warningSoft,
    text: palette.warning,
    dot: palette.warning,
  },
  danger: {
    background: palette.dangerSoft,
    text: palette.danger,
    dot: palette.danger,
  },
};

export function Badge({ label, tone = 'neutral', showDot = true }: BadgeProps) {
  const colors = toneStyles[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      {showDot ? <View style={[styles.dot, { backgroundColor: colors.dot }]} /> : null}
      <AppText variant="labelSmall" color={colors.text} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

export const buildStatusMeta: Record<
  BuildStatus,
  { label: string; tone: BadgeTone }
> = {
  queued: { label: 'Menunggu', tone: 'warning' },
  in_progress: { label: 'Berjalan', tone: 'info' },
  success: { label: 'Siap', tone: 'success' },
  failed: { label: 'Gagal', tone: 'danger' },
};

export function BuildStatusBadge({ status }: { status: BuildStatus }) {
  const meta = buildStatusMeta[status];
  return <Badge label={meta.label} tone={meta.tone} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    textTransform: 'uppercase',
  },
});
