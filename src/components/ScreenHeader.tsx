import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, radii, spacing } from '@/constants/theme';
import { AppText } from './AppText';

type ScreenHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  onBack,
  right,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ChevronLeft color={palette.text} size={22} strokeWidth={2.2} />
        </Pressable>
      ) : null}

      <View style={styles.textBlock}>
        {eyebrow ? (
          <AppText variant="label" color={palette.primary} style={styles.eyebrow}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="h1" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" color={palette.muted} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.7,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    textTransform: 'uppercase',
  },
  subtitle: {
    marginTop: 3,
  },
  right: {
    marginTop: 2,
  },
});
