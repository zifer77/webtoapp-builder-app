import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { palette, radii, shadows, spacing } from '@/constants/theme';

export type ToastVariant = 'info' | 'success' | 'error';

type ToastMessage = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastIcons = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const;

const toastColors: Record<ToastVariant, string> = {
  info: '#93C5FD',
  success: '#6EE7B7',
  error: '#FCA5A5',
};

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-10);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);

  const clearTimers = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (removeTimer.current) {
      clearTimeout(removeTimer.current);
      removeTimer.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const nextId = toastId.current + 1;
      toastId.current = nextId;
      clearTimers();

      setToast({ id: nextId, message, variant });
      opacity.set(withTiming(1, { duration: 180 }));
      translateY.set(withTiming(0, { duration: 220 }));

      hideTimer.current = setTimeout(() => {
        opacity.set(withTiming(0, { duration: 180 }));
        translateY.set(withTiming(-8, { duration: 180 }));
        removeTimer.current = setTimeout(() => {
          if (toastId.current === nextId) {
            setToast(null);
          }
        }, 200);
      }, 3200);
    },
    [clearTimers, opacity, translateY],
  );

  useEffect(() => clearTimers, [clearTimers]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  const value = useMemo(() => ({ showToast }), [showToast]);
  const Icon = toast ? toastIcons[toast.variant] : Info;

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {toast ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              { top: insets.top + spacing.sm },
              animatedStyle,
            ]}
          >
            <Icon color={toastColors[toast.variant]} size={19} strokeWidth={2.2} />
            <AppText
              variant="bodyStrong"
              color={palette.white}
              style={styles.message}
              numberOfLines={4}
            >
              {toast.message}
            </AppText>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast harus dipakai di dalam ToastProvider.');
  }
  return context;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: palette.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...shadows.floating,
  },
  message: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
  },
});
