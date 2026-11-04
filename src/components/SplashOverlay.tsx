import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { palette, spacing } from '@/constants/theme';
import { AppText } from './AppText';

type SplashOverlayProps = {
  onDone: () => void;
};

export function SplashOverlay({ onDone }: SplashOverlayProps) {
  const overlayOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.86);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslate = useSharedValue(14);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: 720,
      easing: Easing.out(Easing.cubic),
    });
    textOpacity.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
    textTranslate.value = withTiming(0, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    });

    const timer = setTimeout(() => {
      overlayOpacity.value = withTiming(
        0,
        { duration: 320, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(onDone)();
          }
        },
      );
    }, 1500);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, onDone, overlayOpacity, textOpacity, textTranslate]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslate.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
      <LinearGradient
        colors={[palette.primary, palette.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.decorLarge} />
      <View style={styles.decorSmall} />

      <View style={styles.center}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require('../../assets/images/adaptive-icon.png')}
            style={styles.logo}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
        <Animated.View style={[styles.textBlock, textStyle]}>
          <AppText
            variant="brand"
            color={palette.white}
            style={styles.wordmark}
          >
            WebToApp
          </AppText>
          <AppText variant="label" color="rgba(255,255,255,0.78)" style={styles.tagline}>
            WEBSITE JADI APLIKASI
          </AppText>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerDot} />
        <AppText variant="labelSmall" color="rgba(255,255,255,0.62)" style={styles.footerText}>
          MENYIAPKAN WORKSPACE
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  decorLarge: {
    position: 'absolute',
    top: -120,
    right: -150,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  decorSmall: {
    position: 'absolute',
    bottom: -80,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  center: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  logoWrap: {
    width: 132,
    height: 132,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  logo: {
    width: 100,
    height: 100,
  },
  textBlock: {
    alignItems: 'center',
    gap: 5,
  },
  wordmark: {
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 3.2,
  },
  footer: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  footerText: {
    letterSpacing: 2,
  },
});
