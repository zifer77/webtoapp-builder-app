import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette, radii, spacing } from '@/constants/theme';
import { AppText } from './AppText';

type StepIndicatorProps = {
  steps: string[];
  current: number;
  onStepPress?: (index: number) => void;
};

export function StepIndicator({ steps, current, onStepPress }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isActive = index === current;
        const isComplete = index < current;
        const canPress = Boolean(onStepPress) && (isComplete || isActive);

        return (
          <Fragment key={step}>
            <View style={styles.item}>
              <View style={styles.circleRow}>
                <View
                  style={[
                    styles.connector,
                    index === 0 && styles.connectorHidden,
                    index > 0 && (isComplete || isActive) && styles.connectorActive,
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Langkah ${index + 1}: ${step}`}
                  accessibilityState={{ selected: isActive, disabled: !canPress }}
                  disabled={!canPress}
                  onPress={() => {
                    if (canPress) {
                      void Haptics.selectionAsync();
                      onStepPress?.(index);
                    }
                  }}
                  style={[
                    styles.circle,
                    isActive && styles.circleActive,
                    isComplete && styles.circleComplete,
                  ]}
                >
                  {isComplete ? (
                    <Check color={palette.white} size={14} strokeWidth={3} />
                  ) : (
                    <AppText
                      variant="labelSmall"
                      color={isActive ? palette.white : palette.faint}
                      style={styles.number}
                    >
                      {index + 1}
                    </AppText>
                  )}
                </Pressable>
                <View
                  style={[
                    styles.connector,
                    index === steps.length - 1 && styles.connectorHidden,
                    isComplete && styles.connectorActive,
                  ]}
                />
              </View>
              <AppText
                variant="labelSmall"
                color={isActive ? palette.primaryDark : isComplete ? palette.textSecondary : palette.faint}
                style={styles.label}
                numberOfLines={1}
              >
                {step}
              </AppText>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  circleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: palette.border,
  },
  connectorActive: {
    backgroundColor: palette.primary,
  },
  connectorHidden: {
    opacity: 0,
  },
  circle: {
    width: 29,
    height: 29,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
  },
  circleActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  circleComplete: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  number: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
  },
  label: {
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
