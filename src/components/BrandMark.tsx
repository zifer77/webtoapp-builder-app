import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, spacing } from '@/constants/theme';
import { AppText } from './AppText';

type BrandMarkProps = {
  size?: number;
  showWordmark?: boolean;
  tone?: 'dark' | 'light';
  style?: StyleProp<ViewStyle>;
};

export function BrandMark({
  size = 38,
  showWordmark = true,
  tone = 'dark',
  style,
}: BrandMarkProps) {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../assets/images/icon.png')}
        style={{ width: size, height: size, borderRadius: size * 0.24 }}
        accessibilityIgnoresInvertColors
      />
      {showWordmark ? (
        <AppText
          variant="brand"
          color={tone === 'light' ? palette.white : palette.text}
          style={{ fontSize: size * 0.68, lineHeight: size * 0.78 }}
        >
          WebToApp
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
