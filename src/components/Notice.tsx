import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, radii, spacing } from '@/constants/theme';
import { AppText } from './AppText';

export type NoticeTone = 'info' | 'warning' | 'error' | 'success';

type NoticeProps = {
  tone?: NoticeTone;
  title?: string;
  message: string;
  style?: StyleProp<ViewStyle>;
};

const toneStyles: Record<
  NoticeTone,
  { background: string; border: string; icon: string; title: string; Icon: LucideIcon }
> = {
  info: {
    background: palette.primarySoft,
    border: palette.primaryMuted,
    icon: palette.primary,
    title: palette.primaryDeep,
    Icon: Info,
  },
  warning: {
    background: palette.warningSoft,
    border: '#FDE68A',
    icon: palette.warning,
    title: '#92400E',
    Icon: AlertTriangle,
  },
  error: {
    background: palette.dangerSoft,
    border: '#FECACA',
    icon: palette.danger,
    title: '#991B1B',
    Icon: AlertCircle,
  },
  success: {
    background: palette.successSoft,
    border: '#A7F3D0',
    icon: palette.success,
    title: '#065F46',
    Icon: CheckCircle2,
  },
};

export function Notice({ tone = 'info', title, message, style }: NoticeProps) {
  const config = toneStyles[tone];
  const Icon = config.Icon;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.background, borderColor: config.border },
        style,
      ]}
    >
      <Icon color={config.icon} size={18} strokeWidth={2.2} style={styles.icon} />
      <View style={styles.textBlock}>
        {title ? (
          <AppText variant="bodyStrong" color={config.title} style={styles.title}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="caption" color={palette.textSecondary} style={styles.message}>
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.sm + 2,
  },
  icon: {
    marginTop: 1,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  message: {
    lineHeight: 18,
  },
});
