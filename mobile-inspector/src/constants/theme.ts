/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1B2D',
    background: '#F4F6F8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7F7EE',
    textSecondary: '#5B6B7B',
    primary: '#16BE66',
    onPrimary: '#FFFFFF',
    border: '#E3E8ED',
    danger: '#E5484D',
    success: '#16BE66',
    warning: '#F5A623',
    tint: '#16BE66',
    // Brand navy used for headers, hero surfaces and the primary CTA.
    brand: '#0D2236',
    onBrand: '#FFFFFF',
    brandElevated: '#143049',
  },
  dark: {
    text: '#F2F5F8',
    background: '#091523',
    backgroundElement: '#0F2235',
    backgroundSelected: '#15324A',
    textSecondary: '#9BB0C2',
    primary: '#27D07F',
    onPrimary: '#04261A',
    border: '#1B3349',
    danger: '#FF6369',
    success: '#27D07F',
    warning: '#FFC53D',
    tint: '#27D07F',
    brand: '#0D2236',
    onBrand: '#FFFFFF',
    brandElevated: '#143049',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
