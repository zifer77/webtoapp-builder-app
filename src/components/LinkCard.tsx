import { ExternalLink } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette, radii, spacing } from '@/constants/theme';
import { AppText } from './AppText';

type LinkCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
  disabled?: boolean;
};

export function LinkCard({
  icon,
  title,
  description,
  actionLabel,
  onPress,
  disabled = false,
}: LinkCardProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${title}. ${actionLabel}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.content}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {title}
        </AppText>
        <AppText variant="caption" color={palette.muted} style={styles.description}>
          {description}
        </AppText>
        <View style={styles.actionRow}>
          <AppText variant="labelSmall" color={palette.primary} style={styles.action}>
            {actionLabel}
          </AppText>
          <ExternalLink color={palette.primary} size={12} strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.78,
    borderColor: palette.primaryMuted,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  description: {
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  action: {
    textTransform: 'uppercase',
  },
});
