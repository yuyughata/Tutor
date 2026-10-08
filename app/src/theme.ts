import { Platform, type TextStyle, type ViewStyle } from 'react-native';

// CUSTAR brand
export const brand = {
  purple: '#ab46d2',
  teal: '#10a19c',
  amber: '#ffbe00',
  charcoal: '#232323',
};

export const colors = {
  ...brand,
  purpleDeep: '#7a2e99', // darker brand purple for gradients and pressed states
  purpleSoft: '#f4e6fa',
  tealSoft: '#dcf3f2',
  amberSoft: '#fff2c7',
  ink: brand.charcoal,
  muted: '#6b6472',
  bg: '#fbf8fd',
  surface: '#ffffff',
  border: '#ece3f1',
  lock: '#9a93a1',
  danger: '#c0392b',
  onPurple: '#ffffff', // 4.6:1 on #ab46d2
  onTeal: brand.charcoal, // white on #10a19c is only 3.2:1, so use charcoal text
  onAmber: brand.charcoal,
};

export const fonts = {
  regular: 'Nunito_600SemiBold',
  bold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};

export const type = {
  display: { fontFamily: fonts.black, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 } satisfies TextStyle,
  title: { fontFamily: fonts.black, fontSize: 22, lineHeight: 27, letterSpacing: -0.2 } satisfies TextStyle,
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 } satisfies TextStyle,
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 } satisfies TextStyle,
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 } satisfies TextStyle,
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' } satisfies TextStyle,
};

export const radius = { sm: 12, md: 18, lg: 26, xl: 34, pill: 999 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const shadow = {
  soft: Platform.select<ViewStyle>({
    ios: { shadowColor: '#3b1a4a', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 4 },
    default: { boxShadow: '0 8px 24px rgba(59,26,74,0.14)' } as ViewStyle,
  })!,
  lift: Platform.select<ViewStyle>({
    ios: { shadowColor: '#3b1a4a', shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 14 } },
    android: { elevation: 10 },
    default: { boxShadow: '0 16px 40px rgba(59,26,74,0.24)' } as ViewStyle,
  })!,
};

// Reader type scale per age band (younger children get larger type) and reading themes.
export const readerFontBase = { '2-4': 30, '5-8': 24, '9-12': 19 } as const;

export const readerThemes = {
  day: { bg: '#ffffff', sheet: '#ffffff', ink: brand.charcoal, muted: '#6b6472', icon: 'sunny' },
  sepia: { bg: '#f6ecd9', sheet: '#f6ecd9', ink: '#3b2f1e', muted: '#7a6a50', icon: 'cafe' },
  night: { bg: '#1b1620', sheet: '#1b1620', ink: '#f1ebf5', muted: '#a99fb3', icon: 'moon' },
} as const;
export type ReaderThemeName = keyof typeof readerThemes;

export const avatars = [
  { id: 'fox', emoji: '🦊', bg: brand.amber },
  { id: 'owl', emoji: '🦉', bg: brand.purple },
  { id: 'bear', emoji: '🐻', bg: brand.teal },
  { id: 'bunny', emoji: '🐰', bg: '#f19ad4' },
  { id: 'panda', emoji: '🐼', bg: '#7ed6d1' },
  { id: 'lion', emoji: '🦁', bg: '#ffd966' },
  { id: 'frog', emoji: '🐸', bg: '#c78ae3' },
  { id: 'penguin', emoji: '🐧', bg: '#4fb8b4' },
] as const;
