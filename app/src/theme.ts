import { Platform, type TextStyle, type ViewStyle } from 'react-native';

// CUSTAR brand
export const brand = {
  purple: '#ab46d2',
  teal: '#10a19c',
  amber: '#ffbe00',
  charcoal: '#232323',
};

// ---- Themes -------------------------------------------------------------------------------------
// Purple is the default and the original look: purple accents AND purple main-action buttons.
// Teal is the alternative: teal accents with amber main-action buttons. Every theme has its own Day, Sepia and
// Night reader modes. Main actions are the buttons that move the child or parent forward (`colors.action`).
export type ThemeId = 'purple' | 'teal';

const common = {
  amber: brand.amber,
  amberSoft: '#fff2c7',
  amberDeep: '#7a5a00', // text on amberSoft, 5.6:1
  onAmber: brand.charcoal,
  ink: brand.charcoal,
  muted: '#6b6472',
  surface: '#ffffff',
  lock: '#9a93a1',
  danger: '#c0392b',
};

export const themes = {
  purple: {
    ...common,
    primary: '#ab46d2',
    primaryDeep: '#7a2e99', // darker brand purple for small text, gradients and pressed states
    primarySoft: '#f4e6fa',
    onPrimary: '#ffffff', // 4.6:1 on #ab46d2
    action: '#ab46d2', // main action buttons are purple in the default theme
    onAction: '#ffffff', // white on purple, 4.6:1
    actionSoft: '#f4e6fa',
    actionDeep: '#7a2e99',
    secondary: '#10a19c',
    secondarySoft: '#dcf3f2',
    secondaryDeep: '#0b6f6b', // text on white / secondarySoft
    onSecondary: brand.charcoal, // white on #10a19c is only 3.2:1, so use charcoal text
    bg: '#fbf8fd',
    border: '#ece3f1',
  },
  teal: {
    ...common,
    primary: '#10a19c',
    primaryDeep: '#0b6f6b',
    primarySoft: '#dcf3f2',
    onPrimary: brand.charcoal, // charcoal on teal 4.9:1 (white would be only 3.2:1)
    action: brand.amber, // the teal theme keeps amber main-action buttons
    onAction: brand.charcoal, // charcoal on amber, 9.4:1
    actionSoft: '#fff2c7',
    actionDeep: '#7a5a00',
    secondary: '#ab46d2',
    secondarySoft: '#f4e6fa',
    secondaryDeep: '#7a2e99',
    onSecondary: '#ffffff',
    bg: '#f5fbfa',
    border: '#d6ebe9',
  },
} as const;

export const themeOptions: { id: ThemeId; name: string; blurb: string }[] = [
  { id: 'purple', name: 'Purple', blurb: 'The classic Genova look' },
  { id: 'teal', name: 'Teal', blurb: 'Fresh and calm' },
];

type Colors = { [K in keyof (typeof themes)['purple']]: string };
/** Live colour tokens. They change when the theme changes (see `applyTheme`); read them while rendering, never cache them at import. */
export const colors: Colors = { ...themes.purple };

let themeVersion = 0;
export let currentTheme: ThemeId = 'purple';
export const getThemeVersion = () => themeVersion;
export function applyTheme(id: ThemeId): void {
  currentTheme = id;
  Object.assign(colors, themes[id]);
  themeVersion += 1;
}

/**
 * Styles that depend on theme colours: `const styles = themed(() => StyleSheet.create({...}))`.
 * Rebuilt on first use after the theme changes, so a theme switch re-skins every screen.
 */
export function themed<T extends object>(factory: () => T): T {
  let cache: T | undefined;
  let built = -1;
  const get = () => { if (cache === undefined || built !== themeVersion) { cache = factory(); built = themeVersion; } return cache; };
  return new Proxy({} as T, {
    get: (_t, k) => (get() as Record<PropertyKey, unknown>)[k],
    has: (_t, k) => k in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_t, k) => ({ enumerable: true, configurable: true, value: (get() as Record<PropertyKey, unknown>)[k] }),
  });
}

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

// Reader type scale per reading level (earlier readers get larger type) and reading themes.
export const readerFontBase = { sunrise: 30, spark: 24, seeker: 19 } as const;

const readerModes = {
  purple: {
    day: { bg: '#ffffff', sheet: '#ffffff', ink: brand.charcoal, muted: '#6b6472', icon: 'sunny' },
    sepia: { bg: '#f6ecd9', sheet: '#f6ecd9', ink: '#3b2f1e', muted: '#7a6a50', icon: 'cafe' },
    night: { bg: '#1b1620', sheet: '#1b1620', ink: '#f1ebf5', muted: '#a99fb3', icon: 'moon' },
  },
  teal: {
    day: { bg: '#f7fdfc', sheet: '#f7fdfc', ink: brand.charcoal, muted: '#566764', icon: 'sunny' },
    sepia: { bg: '#f3ead7', sheet: '#f3ead7', ink: '#33301f', muted: '#6f6a50', icon: 'cafe' },
    night: { bg: '#10201f', sheet: '#10201f', ink: '#e8f4f3', muted: '#9ab6b3', icon: 'moon' },
  },
} as const;
/** The Day / Sepia / Night reader modes of the current theme. */
export const readerThemes = themed(() => readerModes[currentTheme]);
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
