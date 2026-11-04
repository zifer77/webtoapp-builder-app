import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const palette = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryDeep: '#1E40AF',
  primarySoft: '#EFF6FF',
  primaryMuted: '#DBEAFE',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#475569',
  muted: '#64748B',
  faint: '#94A3B8',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.48)',
} as const;

export const fonts = {
  body: 'Poppins_400Regular',
  bodyMedium: 'Poppins_500Medium',
  bodySemibold: 'Poppins_600SemiBold',
  bodyBold: 'Poppins_700Bold',
  display: 'Aktura_400Regular',
  label: 'Rajdhani_500Medium',
  labelSemibold: 'Rajdhani_600SemiBold',
  labelBold: 'Rajdhani_700Bold',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  pill: 999,
} as const;

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
  button: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.24,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
} as const;

export type TextVariant =
  | 'display'
  | 'number'
  | 'brand'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  | 'labelSmall'
  | 'button'
  | 'nav';

export const typography: Record<TextVariant, TextStyle> = {
  display: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: 0.2,
  },
  number: {
    fontFamily: fonts.display,
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: 0.5,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 27,
    lineHeight: 30,
    letterSpacing: 0.6,
  },
  h1: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fonts.bodySemibold,
    fontSize: 21,
    lineHeight: 29,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fonts.bodySemibold,
    fontSize: 17,
    lineHeight: 25,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 23,
  },
  bodyStrong: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14.5,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
  },
  label: {
    fontFamily: fonts.labelSemibold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.9,
  },
  labelSmall: {
    fontFamily: fonts.labelSemibold,
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: 0.8,
  },
  button: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15.5,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  nav: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
};

export const theme = {
  palette,
  fonts,
  spacing,
  radii,
  shadows,
  typography,
} as const;
