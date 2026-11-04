import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, radii, spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>{icon}</View>
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      <AppText variant="body" color={palette.muted} align="center" style={styles.description}>
        {description}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} size="md" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
    marginBottom: spacing.lg,
  },
  description: {
    marginTop: 7,
    maxWidth: 300,
  },
  action: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },
});
