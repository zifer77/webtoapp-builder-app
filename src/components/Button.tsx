import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { palette, radii, shadows, spacing } from '@/constants/theme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  secondary: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primarySoft,
  },
  ghost: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  danger: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
  },
};

const labelColors: Record<ButtonVariant, string> = {
  primary: palette.white,
  secondary: palette.primaryDark,
  ghost: palette.text,
  danger: palette.white,
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  md: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'right',
  loading = false,
  disabled = false,
  fullWidth = true,
  haptic = true,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const handlePress = () => {
    if (isDisabled) {
      return;
    }
    if (haptic) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Animated.View
      style={[
        fullWidth && styles.fullWidth,
        variant === 'primary' && shadows.button,
        animatedStyle,
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={handlePress}
        onPressIn={() => {
          scale.set(withTiming(0.975, { duration: 100 }));
        }}
        onPressOut={() => {
          scale.set(withTiming(1, { duration: 140 }));
        }}
        style={({ pressed }) => [
          styles.base,
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && styles.fullWidth,
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={labelColors[variant]} />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' ? <View style={styles.icon}>{icon}</View> : null}
            <AppText variant="button" color={labelColors[variant]} numberOfLines={1}>
              {label}
            </AppText>
            {icon && iconPosition === 'right' ? <View style={styles.icon}>{icon}</View> : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
});
