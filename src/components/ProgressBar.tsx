import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { palette, radii } from '@/constants/theme';

type ProgressBarProps = {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
};

export function ProgressBar({
  progress,
  color = palette.primary,
  trackColor = palette.border,
  height = 8,
}: ProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const width = useSharedValue(0);
  const clamped = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    const target = (trackWidth * clamped) / 100;
    width.value = withTiming(target, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, trackWidth, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      onLayout={handleLayout}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}
    >
      <Animated.View
        style={[
          styles.fill,
          { height, borderRadius: height / 2, backgroundColor: color },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radii.pill,
  },
});
