import { Platform } from 'react-native';

export const colors = {
  background: '#0C0E12',
  backgroundRaised: '#15171C',
  surface: '#181B21',
  surfaceRaised: '#1A1D23',
  surfaceSoft: '#20242B',
  border: '#2C3038',
  borderStrong: '#30343C',
  text: '#F7F8FA',
  textSecondary: '#C8CDD6',
  textMuted: '#8C919B',
  textFaint: '#666F7C',
  blue: '#6283FF',
  blueSoft: '#222C52',
  green: '#43D17D',
  greenSoft: '#173827',
  yellow: '#F3C65B',
  yellowSoft: '#3B321D',
  orange: '#F29D63',
  red: '#F06C75',
  redSoft: '#3D2026',
  purple: '#A98BFF',
  cyan: '#65C7D9',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const fonts = {
  regular: 'BuilderSansRegular',
  medium: 'BuilderSansMedium',
  semibold: 'BuilderSansSemibold',
  bold: 'BuilderSansBold',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 22,
  pill: 999,
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: colors.black,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  default: { elevation: 5 },
});

export const contentMaxWidth = 460;
