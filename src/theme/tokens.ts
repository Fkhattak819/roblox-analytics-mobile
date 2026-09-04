import { DynamicColorIOS, Platform } from 'react-native';

// Figma's light page uses iOS semantic label/fill colors. DynamicColorIOS keeps
// existing StyleSheets reusable while allowing Appearance.setColorScheme to
// switch the entire native app without rebuilding every screen.
const adaptive = (light: string, dark: string) => (
  Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) as unknown as string : dark
);

export const colors = {
  background: adaptive('#FFFFFF', '#0C0E12'),
  backgroundRaised: adaptive('#F7F8FB', '#15171C'),
  surface: adaptive('#F7F8FB', '#181B21'),
  surfaceRaised: adaptive('#F1F3F7', '#1A1D23'),
  surfaceSoft: adaptive('rgba(118,118,128,0.12)', '#20242B'),
  border: adaptive('#E3E6EC', '#2C3038'),
  borderStrong: adaptive('#D5D9E2', '#30343C'),
  text: adaptive('#000000', '#F7F8FA'),
  textSecondary: adaptive('rgba(60,60,67,0.78)', '#C8CDD6'),
  textMuted: adaptive('rgba(60,60,67,0.60)', '#8C919B'),
  textFaint: adaptive('rgba(60,60,67,0.30)', '#666F7C'),
  blue: adaptive('#5F83FF', '#6283FF'),
  blueSoft: adaptive('#EDF1FF', '#222C52'),
  green: adaptive('#159B55', '#43D17D'),
  greenSoft: adaptive('#E8F7EE', '#173827'),
  yellow: adaptive('#A66A00', '#F3C65B'),
  yellowSoft: adaptive('#FFF4D1', '#3B321D'),
  orange: adaptive('#C76524', '#F29D63'),
  red: adaptive('#D83E51', '#F06C75'),
  redSoft: adaptive('#FDECEF', '#3D2026'),
  purple: adaptive('#7654D6', '#A98BFF'),
  cyan: adaptive('#218AA0', '#65C7D9'),
  tabBar: adaptive('#FFFFFF', '#0B0D11'),
  tabBarBorder: adaptive('#E3E6EC', '#171A20'),
  modalSurface: adaptive('#FFFFFF', '#0B0D11'),
  controlSurface: adaptive('rgba(116,116,128,0.08)', '#15181F'),
  selectedSurface: adaptive('#EDF1FF', '#273044'),
  skeleton: adaptive('rgba(118,118,128,0.16)', '#353C48'),
  skeletonMuted: adaptive('rgba(118,118,128,0.10)', '#252A33'),
  skeletonAccent: adaptive('#E5EAFA', '#2D3546'),
  blueBorder: adaptive('#CCD6FA', '#354477'),
  greenBorder: adaptive('#BEE7CD', '#28543A'),
  yellowBorder: adaptive('#EDD99D', '#574922'),
  redBorder: adaptive('#F1BCC4', '#60303A'),
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
