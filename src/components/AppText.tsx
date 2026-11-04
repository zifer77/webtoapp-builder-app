import { Platform, StyleSheet, Text, type TextProps } from 'react-native';
import { palette, typography, type TextVariant } from '@/constants/theme';
import { useFontsReady } from '@/providers/FontProvider';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
};

const fallbackFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export function AppText({
  variant = 'body',
  color = palette.text,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const fontsReady = useFontsReady();
  const baseStyle = typography[variant];
  const fontFamily = fontsReady ? baseStyle.fontFamily : fallbackFamily;

  return (
    <Text
      {...rest}
      style={[styles.text, baseStyle, { fontFamily, color, textAlign: align }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
