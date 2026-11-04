import * as Haptics from 'expo-haptics';
import { History, Home, Settings } from 'lucide-react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette, radii, shadows, spacing } from '@/constants/theme';
import { AppText } from './AppText';

const tabConfig = {
  index: {
    label: 'Beranda',
    Icon: Home,
  },
  history: {
    label: 'Riwayat',
    Icon: History,
  },
  settings: {
    label: 'Pengaturan',
    Icon: Settings,
  },
} as const;

type TabName = keyof typeof tabConfig;

function isTabName(name: string): name is TabName {
  return name in tabConfig;
}

export function CustomTabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          if (!isTabName(route.name)) {
            return null;
          }

          const config = tabConfig[route.name];
          const Icon = config.Icon;
          const isFocused = state.index === index;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={config.label}
              accessibilityState={{ selected: isFocused }}
              onPress={() => {
                if (!isFocused) {
                  void Haptics.selectionAsync();
                  navigateToTab(route.key);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
                isFocused && styles.tabActive,
                pressed && styles.pressed,
              ]}
            >
              <Icon
                color={isFocused ? palette.primary : palette.muted}
                size={20}
                strokeWidth={isFocused ? 2.4 : 2}
              />
              <AppText
                variant="nav"
                color={isFocused ? palette.primaryDark : palette.muted}
                style={styles.label}
              >
                {config.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.9)',
    backgroundColor: palette.surface,
    padding: 7,
    ...shadows.floating,
  },
  tab: {
    flex: 1,
    minHeight: 54,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabActive: {
    backgroundColor: palette.primarySoft,
  },
  pressed: {
    opacity: 0.68,
  },
  label: {
    letterSpacing: 0.1,
  },
});
